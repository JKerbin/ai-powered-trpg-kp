import { RAGApplicationBuilder, RAGApplication } from "@llm-tools/embedjs";
import { OpenAi } from "@llm-tools/embedjs-openai";
import { OpenAiEmbeddings } from "@llm-tools/embedjs-openai";
import { HNSWDb } from "@llm-tools/embedjs-hnswlib";
import { PdfLoader } from "@llm-tools/embedjs-loader-pdf";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";
import { z } from "zod";

const MAX_RETRIES = 3; // 最大重试次数启发值

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "..", ".env");

const dotenvResult = dotenv.config({
  path: envPath,
});

if (dotenvResult.error) throw new Error("The .env file cannot be loaded.");
if (!process.env.OPENAI_API_KEY)
  throw new Error(
    "Please make sure that the .env file has set the OPENAI_API_KEY environment variable."
  );

class StructureDataProcessor {
  private ragApplication: RAGApplication;
  saveFilePath: string;

  // 定义结构数据模式和对应prompt
  static StructureDataSchema = z
    .object({
      scene: z.string(),
      events: z.array(z.string()).optional().default([]),
      characters: z.array(z.string()).optional().default([]),
      secrets: z.array(z.string()).optional().default([]),
    })
    .strict();
  static dataFormatSpecification: string = `{
    scene:[地点名称(类型为string)],
    events:[地点下对应事件(类型为string数组，允许为空数组)],
    characters:[地点下对应角色(类型为string数组，允许为空数组)],
    secrets:[地点下对应秘密(类型为string数组，允许为空数组)],
  }`;

  private constructor(ragApplication: RAGApplication, saveFilePath: string) {
    this.ragApplication = ragApplication;
    this.saveFilePath = saveFilePath;
  }

  // 创建结构数据处理器和存档信息
  static async create(
    saveFilePath: string,
    model: modelType = "gpt-4o-mini",
    embeddingModel: embeddingModelType = "text-embedding-3-small"
  ): Promise<StructureDataProcessor> {
    const ragApplication = await new RAGApplicationBuilder()
      .setModel(
        new OpenAi({
          configuration: { baseURL: process.env.OPENAI_API_BASE },
          apiKey: process.env.OPENAI_API_KEY,
          model: model,
        })
      )
      .setEmbeddingModel(
        new OpenAiEmbeddings({
          configuration: { baseURL: process.env.OPENAI_API_BASE },
          apiKey: process.env.OPENAI_API_KEY,
          model: embeddingModel,
        })
      )
      .setVectorDatabase(new HNSWDb())
      .build();

    try {
      await fs.access(path.join(saveFilePath, "structureData.json"));
    } catch (accessError) {
      // 文件不存在，创建空文件
      await fs.mkdir(saveFilePath, { recursive: true });
      await fs.writeFile(
        path.join(saveFilePath, "structureData.json"),
        JSON.stringify([], null, 2),
        "utf-8"
      );
    }

    return new StructureDataProcessor(ragApplication, saveFilePath);
  }

  private async query(query: string): Promise<string> {
    const result = await this.ragApplication.query(query);
    return result.content;
  }

  async createStructureData(): Promise<void> {
    await this.ragApplication.addLoader(
      new PdfLoader({
        filePathOrUrl: path.join(this.saveFilePath, "scenario.pdf"),
      })
    );
    const response = await this.query(
      `请根据${StructureDataProcessor.dataFormatSpecification}的格式，详细解析剧本模组中的所有地点，以及地点所对应的事件、角色、和可探索发掘的秘密。请着重关注剧本引入调查员的地点，并将其放在列表的第一个`
    );

    function formatData(data: string) {
      // 使用正则表达式匹配格式内容
      const formattingData: any[] = [];
      const regex = /\{[^{}]*\}/g;
      let match;

      // 储存需要重新格式化解析的角色信息
      const unformattedData: string[] = [];

      while ((match = regex.exec(data)) !== null) {
        try {
          // 清洗影响JSON解析的符号：移除换行符和多余空格
          const cleanedJson = match[0]
            .replace(/\n/g, "")
            .replace(/\s+/g, " ")
            .trim();
          const jsonData = JSON.parse(cleanedJson);
          formattingData.push(jsonData);
        } catch (error) {
          unformattedData.push(match[0]);
        }
      }
      return [formattingData, unformattedData];
    }

    const [formattingData, unformattedData] = formatData(response);
    let enhanceTime = MAX_RETRIES;

    while (enhanceTime > 0) {
      const revisal = await this.query(
        `目前已经添加的结构数据为：${JSON.stringify(formattingData)}，请根据${
          StructureDataProcessor.dataFormatSpecification
        }的格式，检测剧本模组中是否有未被添加的地点。如果有，请按照格式返回需要添加的部分。`
      );

      // 格式化并校验
      const [revisedFormattingData, revisedUnformattedData] =
        formatData(revisal);
      unformattedData.push(...revisedUnformattedData);
      formattingData.push(...revisedFormattingData);
      enhanceTime--;
    }

    // 校验结构数据并移除格式不正确的内容
    // 使用filter方法保留格式完整的结构数据
    const [structureData, unformattedStructureData] =
      this.verifyStructureData(formattingData);

    // 合并unformattedData和unformattedCharacterInfo
    const allUnformattedData = [
      ...unformattedData,
      ...unformattedStructureData,
    ];
    let currentUnformattedData = allUnformattedData;
    let maxRetries = MAX_RETRIES; // 设置最大重试次数，避免无限循环

    // 循环请求模型格式化不完整的结构数据，直到所有结构数据都被格式化或达到最大重试次数
    while (currentUnformattedData.length > 0 && maxRetries > 0) {
      const revisal = await this.query(
        `请根据${
          StructureDataProcessor.dataFormatSpecification
        }的格式，补充查证并重新格式化以下结构数据：${currentUnformattedData.join(
          "\n"
        )}`
      );

      // 格式化并校验
      const [revisedFormattingData, revisedUnformattedData] =
        formatData(revisal);
      const [validRevisedStructureData, invalidRevisedStructureData] =
        this.verifyStructureData(revisedFormattingData);
      currentUnformattedData = [
        ...revisedUnformattedData,
        ...invalidRevisedStructureData,
      ];
      structureData.push(...validRevisedStructureData);
      maxRetries--;
    }

    if (currentUnformattedData.length > 0) {
      throw new Error(
        `无法格式化所有结构数据，仍有${currentUnformattedData.length}条信息格式不正确`
      );
    }

    // 将格式化正确的结构数据保存到文件
    try {
      await fs.mkdir(this.saveFilePath, { recursive: true });
      await fs.writeFile(
        path.join(this.saveFilePath, "structureData.json"),
        JSON.stringify(structureData, null, 2),
        "utf-8"
      );
    } catch (error) {
      throw new Error(
        `保存结构数据到文件时发生错误: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  verifyStructureData(structureData: Array<any>): [Array<object>, Array<any>] {
    const unformattedData: any[] = [];
    const formattingData = structureData.filter((structure) => {
      try {
        // 校验角色信息
        StructureDataProcessor.StructureDataSchema.parse(structure);
        return true;
      } catch (error) {
        // 验证失败，加入未格式化数据
        unformattedData.push(JSON.stringify(structure));
        return false;
      }
    });
    return [formattingData, unformattedData];
  }

  async getScenelist(): Promise<string[]> {
    try {
      const data = await fs.readFile(
        path.join(this.saveFilePath, "structureData.json"),
        "utf-8"
      );
      const structures: StructureData[] = JSON.parse(data);
      return structures.map((struct) => struct.scene);
    } catch (error) {
      throw new Error(
        `读取场景信息文件时发生错误: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async getSceneInfo(sceneName: string): Promise<StructureData> {
    try {
      const data = await fs.readFile(
        path.join(this.saveFilePath, "structureData.json"),
        "utf-8"
      );
      const structures: StructureData[] = JSON.parse(data);
      const structure = structures.find((struct) => struct.scene === sceneName);
      if (!structure) {
        throw new Error(`未找到名称为${sceneName}的场景`);
      }
      return structure;
    } catch (error) {
      throw new Error(
        `读取场景信息文件时发生错误: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

export type StructureData = z.infer<
  typeof StructureDataProcessor.StructureDataSchema
>;

export default StructureDataProcessor;
