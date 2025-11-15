import {
  RAGApplicationBuilder,
  RAGApplication,
  JsonLoader,
} from "@llm-tools/embedjs";
import { OpenAi } from "@llm-tools/embedjs-openai";
import { OpenAiEmbeddings } from "@llm-tools/embedjs-openai";
import { LibSqlDb } from "@llm-tools/embedjs-libsql";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

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

class PlotRecordProcessor {
  private ragApplication: RAGApplication;
  saveFilePath: string;

  private constructor(ragApplication: RAGApplication, saveFilePath: string) {
    this.ragApplication = ragApplication;
    this.saveFilePath = saveFilePath;
  }

  // 创建RAG应用实例
  static async create(
    saveFilePath: string,
    model: modelType = "gpt-4o-mini",
    embeddingModel: embeddingModelType = "text-embedding-3-small"
  ): Promise<PlotRecordProcessor> {
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
        new LibSqlDb({ path: path.join(saveFilePath, "plotRecord.db") })
      )
      .build();

    return new PlotRecordProcessor(ragApplication, saveFilePath);
  }

  async query(query: string): Promise<string> {
    const result = await this.ragApplication.query(query);
    return result.content;
  }

  async getPlotRecord(query: string): Promise<string> {
    const result = await this.query(
      `请根据剧情记录，给出和”${query}“相关的所有内容`
    );
    return result;
  }

  async addPlotRecord(plotRecord: string): Promise<void> {
    await this.ragApplication.addLoader(
      new JsonLoader({ object: { timestamp: Date.now(), event: plotRecord } })
    );
  }
}

export default PlotRecordProcessor;
