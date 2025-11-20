import { RAGApplicationBuilder, RAGApplication } from "@llm-tools/embedjs";
import { OpenAi } from "@llm-tools/embedjs-openai";
import { OpenAiEmbeddings } from "@llm-tools/embedjs-openai";
import { LibSqlDb } from "@llm-tools/embedjs-libsql";
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

class CharacterInfoProcessor {
  private ragApplication: RAGApplication;
  saveFilePath: string;

  // 定义角色信息模式，以及其子集模式，和对应prompt
  static CharacterInfoSchema = z
    .object({
      NAME: z.string(),
      STR: z.number(),
      CON: z.number(),
      SIZ: z.number(),
      INT: z.number(),
      POW: z.number(),
      DEX: z.number(),
      APP: z.number(),
      EDU: z.number(),
      SAN: z.number(),
      HP: z.number(),
      WEAPON: z.string(),
      SKILLS: z.array(z.string()),
      DESCRIPTION: z.string(),
    })
    .strict();
  static CharacterInfoPartialSchema =
    CharacterInfoProcessor.CharacterInfoSchema.partial();
  static roleFormatSpecification: string = `{
    NAME:[角色名称(类型为string)],
    STR:[力量(类型为number)],
    CON:[体质(类型为number)],
    SIZ:[体型(类型为number)],
    INT:[智力(类型为number)],
    POW:[力量(类型为number)],
    DEX:[敏捷(类型为number)],
    APP:[魅力(类型为number)],
    EDU:[教育(类型为number)],
    SAN:[理智(类型为number)],
    HP:[生命值(类型为number)],
    WEAPON:[武器(类型为string)],
    SKILLS:[技能(类型为string数组)],
    DESCRIPTION:[角色简介(类型为string)]
  }`;

  private constructor(ragApplication: RAGApplication, saveFilePath: string) {
    this.ragApplication = ragApplication;
    this.saveFilePath = saveFilePath;
  }

  // 创建角色信息处理器和存档信息
  static async create(
    saveFilePath: string,
    model: modelType = "gpt-4o-mini",
    embeddingModel: embeddingModelType = "text-embedding-3-small"
  ): Promise<CharacterInfoProcessor> {
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
      .setVectorDatabase(
        new LibSqlDb({ path: path.join(saveFilePath, "storyInfo.db") })
      )
      .build();

    try {
      await fs.access(path.join(saveFilePath, "characterInfo.json"));
      await fs.access(path.join(saveFilePath, "playerInfo.json"));
    } catch (accessError) {
      // 文件不存在，创建空文件
      await fs.mkdir(saveFilePath, { recursive: true });
      await fs.writeFile(
        path.join(saveFilePath, "characterInfo.json"),
        JSON.stringify([], null, 2),
        "utf-8"
      );
      await fs.writeFile(
        path.join(saveFilePath, "playerInfo.json"),
        JSON.stringify([], null, 2),
        "utf-8"
      );
    }

    return new CharacterInfoProcessor(ragApplication, saveFilePath);
  }

  private async query(query: string): Promise<string> {
    const result = await this.ragApplication.query(query);
    return result.content;
  }

  async createCharacterInfo(): Promise<void> {
    await this.ragApplication.addLoader(
      new PdfLoader({
        filePathOrUrl: path.join(this.saveFilePath, "scenario.pdf"),
      })
    );
    const response = await this.query(
      `请根据${CharacterInfoProcessor.roleFormatSpecification}的格式，列举这个模组的所有角色，以及角色对应的数值和简介`
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

    // 校验角色信息并移除格式不正确的内容
    // 使用filter方法保留格式完整的角色信息
    const [characterInfo, unformattedCharacterInfo] =
      this.verifyCharacterInfo(formattingData);

    // 合并unformattedData和unformattedCharacterInfo
    const allUnformattedData = [
      ...unformattedData,
      ...unformattedCharacterInfo,
    ];
    let currentUnformattedData = allUnformattedData;
    let maxRetries = MAX_RETRIES; // 设置最大重试次数，避免无限循环

    // 循环请求模型格式化不完整的角色信息，直到所有角色信息都被格式化或达到最大重试次数
    while (currentUnformattedData.length > 0 && maxRetries > 0) {
      const revisal = await this.query(
        `请根据${
          CharacterInfoProcessor.roleFormatSpecification
        }的格式，补充查证并重新格式化以下角色信息：${currentUnformattedData.join(
          "\n"
        )}`
      );

      // 格式化并校验
      const [revisedFormattingData, revisedUnformattedData] =
        formatData(revisal);
      const [validRevisedCharacters, invalidRevisedCharacters] =
        this.verifyCharacterInfo(revisedFormattingData);
      currentUnformattedData = [
        ...revisedUnformattedData,
        ...invalidRevisedCharacters,
      ];

      // 将格式正确的角色信息合并到characterInfo中
      characterInfo.push(...validRevisedCharacters);

      // 减少重试次数
      maxRetries--;
    }

    if (currentUnformattedData.length > 0) {
      throw new Error(
        `无法格式化所有角色信息，仍有${currentUnformattedData.length}条信息格式不正确`
      );
    }

    // 将格式化正确的角色信息保存到文件
    try {
      await fs.mkdir(this.saveFilePath, { recursive: true });
      await fs.writeFile(
        path.join(this.saveFilePath, "characterInfo.json"),
        JSON.stringify(characterInfo, null, 2),
        "utf-8"
      );
    } catch (error) {
      throw new Error(
        `保存角色信息到文件时发生错误: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  verifyCharacterInfo(characterInfo: Array<any>): [Array<object>, Array<any>] {
    const unformattedData: any[] = [];
    const formattingData = characterInfo.filter((character) => {
      try {
        // 校验角色信息
        CharacterInfoProcessor.CharacterInfoSchema.parse(character);
        return true;
      } catch (error) {
        // 验证失败，加入未格式化数据
        unformattedData.push(JSON.stringify(character));
        return false;
      }
    });
    return [formattingData, unformattedData];
  }

  async addPlayer(player: CharacterInfo): Promise<void> {
    try {
      const playerInfoPath = path.join(this.saveFilePath, "playerInfo.json");
      CharacterInfoProcessor.CharacterInfoSchema.parse(player);
      const playerNames = await this.getPlayerNames();
      const characterNames = await this.getCharacterNames();
      if (
        playerNames.includes(player.NAME) ||
        characterNames.includes(player.NAME)
      ) {
        throw new Error(`角色名称：“${player.NAME}”已被注册，请改名`);
      }
      const players = await this.getAllPlayerInfo(playerNames);
      players.push(player);
      await fs.writeFile(
        playerInfoPath,
        JSON.stringify(players, null, 2),
        "utf-8"
      );
    } catch (error) {
      throw new Error(
        `添加玩家信息到文件时发生错误: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async getPlayerNames(): Promise<string[]> {
    try {
      const data = await fs.readFile(
        path.join(this.saveFilePath, "playerInfo.json"),
        "utf-8"
      );
      const players: CharacterInfo[] = JSON.parse(data);
      return players.map((player) => player.NAME);
    } catch (error) {
      throw new Error(
        `读取角色信息文件时发生错误: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async getPlayerInfo(playerName: string): Promise<CharacterInfo> {
    try {
      const data = await fs.readFile(
        path.join(this.saveFilePath, "playerInfo.json"),
        "utf-8"
      );
      const players: CharacterInfo[] = JSON.parse(data);
      const player = players.find((player) => player.NAME === playerName);
      if (!player) {
        throw new Error(`未找到名称为${playerName}的角色`);
      }
      return player;
    } catch (error) {
      throw new Error(
        `读取角色信息文件时发生错误: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async getAllPlayerInfo(playerNames: string[]): Promise<CharacterInfo[]> {
    try {
      const playerInfos = await Promise.all(
        playerNames.map(async (name) => await this.getPlayerInfo(name))
      );
      return playerInfos;
    } catch (error) {
      throw new Error(
        `读取玩家信息文件时发生错误: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async modifyPlayerInfo(
    playerName: string,
    modifyContent: CharacterInfoPartial
  ): Promise<void> {
    try {
      // 校验修改内容
      const validatedContent =
        CharacterInfoProcessor.CharacterInfoPartialSchema.parse(modifyContent);
      const data = await fs.readFile(
        path.join(this.saveFilePath, "playerInfo.json"),
        "utf-8"
      );
      const players: CharacterInfo[] = JSON.parse(data);

      // 查找指定角色
      const playerIndex = players.findIndex(
        (player) => player.NAME === playerName
      );
      if (playerIndex === -1) {
        throw new Error(`未找到名称为${playerName}的玩家`);
      }

      // 应用修改
      players[playerIndex] = {
        ...players[playerIndex],
        ...validatedContent,
      };
      await fs.writeFile(
        path.join(this.saveFilePath, "playerInfo.json"),
        JSON.stringify(players, null, 2),
        "utf-8"
      );
    } catch (error) {
      throw new Error(
        `修改玩家信息时发生错误: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async getCharacterNames(): Promise<string[]> {
    try {
      const data = await fs.readFile(
        path.join(this.saveFilePath, "characterInfo.json"),
        "utf-8"
      );
      const characters: CharacterInfo[] = JSON.parse(data);
      return characters.map((char) => char.NAME);
    } catch (error) {
      throw new Error(
        `读取角色信息文件时发生错误: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async getCharacterInfo(characterName: string): Promise<CharacterInfo> {
    try {
      const data = await fs.readFile(
        path.join(this.saveFilePath, "characterInfo.json"),
        "utf-8"
      );
      const characters: CharacterInfo[] = JSON.parse(data);
      const character = characters.find((char) => char.NAME === characterName);
      if (!character) {
        throw new Error(`未找到名称为${characterName}的角色`);
      }
      return character;
    } catch (error) {
      throw new Error(
        `读取角色信息文件时发生错误: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async getAllCharacterInfo(
    characterNames: string[]
  ): Promise<CharacterInfo[]> {
    try {
      const characterInfos = await Promise.all(
        characterNames.map(async (name) => await this.getCharacterInfo(name))
      );
      return characterInfos;
    } catch (error) {
      throw new Error(
        `读取角色信息文件时发生错误: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async modifyCharacterInfo(
    characterName: string,
    modifyContent: CharacterInfoPartial
  ): Promise<void> {
    try {
      // 校验修改内容
      const validatedContent =
        CharacterInfoProcessor.CharacterInfoPartialSchema.parse(modifyContent);
      const data = await fs.readFile(
        path.join(this.saveFilePath, "characterInfo.json"),
        "utf-8"
      );
      const characters: CharacterInfo[] = JSON.parse(data);

      // 查找指定角色
      const characterIndex = characters.findIndex(
        (char) => char.NAME === characterName
      );
      if (characterIndex === -1) {
        throw new Error(`未找到名称为${characterName}的角色`);
      }

      // 应用修改
      characters[characterIndex] = {
        ...characters[characterIndex],
        ...validatedContent,
      };
      await fs.writeFile(
        path.join(this.saveFilePath, "characterInfo.json"),
        JSON.stringify(characters, null, 2),
        "utf-8"
      );
    } catch (error) {
      throw new Error(
        `修改角色信息时发生错误: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

export type CharacterInfo = z.infer<
  typeof CharacterInfoProcessor.CharacterInfoSchema
>;
export type CharacterInfoPartial = z.infer<
  typeof CharacterInfoProcessor.CharacterInfoPartialSchema
>;

export default CharacterInfoProcessor;
