import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";

import CharacterInfoProcessor from "../processors/characterInfo";
import type {
  CharacterInfo,
  CharacterInfoPartial,
} from "../processors/characterInfo";
import PlotRecordProcessor from "../processors/plotRecord";
import StoryInfoProcessor from "../processors/storyInfo";
import StructureDataProcessor from "../processors/structureData";

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

class ModuleTasks {
  saveFilePath: string;
  characterInfoProcessor: CharacterInfoProcessor;
  plotRecordProcessor: PlotRecordProcessor;
  storyInfoProcessor: StoryInfoProcessor;
  structureDataProcessor: StructureDataProcessor;

  private constructor(
    saveFilePath: string,
    characterInfoProcessor: CharacterInfoProcessor,
    plotRecordProcessor: PlotRecordProcessor,
    storyInfoProcessor: StoryInfoProcessor,
    structureDataProcessor: StructureDataProcessor
  ) {
    this.saveFilePath = saveFilePath;
    this.characterInfoProcessor = characterInfoProcessor;
    this.plotRecordProcessor = plotRecordProcessor;
    this.storyInfoProcessor = storyInfoProcessor;
    this.structureDataProcessor = structureDataProcessor;
  }

  private async agentLog(message: string, continueLog = true) {
    console.clear();
    console.log(`Agent: ${message}`);
    if (continueLog) console.log("...");
  }

  static async create(
    saveFilePath: string,
    model: modelType = "gpt-4o-mini",
    embeddingModel: embeddingModelType = "text-embedding-3-small"
  ): Promise<ModuleTasks> {
    const characterInfoProcessor = await CharacterInfoProcessor.create(
      saveFilePath,
      model,
      embeddingModel
    );
    const plotRecordProcessor = await PlotRecordProcessor.create(
      saveFilePath,
      model,
      embeddingModel
    );
    const storyInfoProcessor = await StoryInfoProcessor.create(
      saveFilePath,
      model,
      embeddingModel
    );
    const structureDataProcessor = await StructureDataProcessor.create(
      saveFilePath,
      model,
      embeddingModel
    );
    return new ModuleTasks(
      saveFilePath,
      characterInfoProcessor,
      plotRecordProcessor,
      storyInfoProcessor,
      structureDataProcessor
    );
  }

  async initializeGame(playerInfo: CharacterInfo): Promise<string> {
    try {
      await this.agentLog("初始化故事模组");
      CharacterInfoProcessor.CharacterInfoSchema.parse(playerInfo);
      const [prologue] = await Promise.all([
        // 创建故事信息
        (async () => {
          const prologue = await this.storyInfoProcessor.createStoryInfo();
          await this.agentLog("故事信息初始化完成");
          return prologue;
        })(),

        // 角色信息相关任务（需要按顺序执行）
        (async () => {
          await this.characterInfoProcessor.createCharacterInfo();
          await this.characterInfoProcessor.addPlayer(playerInfo);
          await this.agentLog("角色信息初始化完成");
        })(),

        // 结构数据创建任务
        (async () => {
          await this.structureDataProcessor.createStructureData();
          await this.agentLog("结构数据初始化完成");
        })(),
      ]);
      await this.agentLog("模组信息构建完成", false);
      return prologue;
    } catch (error) {
      throw new Error(
        `初始化游戏存档时发生错误: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async introduceGame(): Promise<string> {
    try {
      const history = [];
      const historyPath = path.join(this.saveFilePath, "history.json");
      await fs.mkdir(this.saveFilePath, { recursive: true });
      await fs.writeFile(historyPath, JSON.stringify([], null, 2), "utf-8");
      const playerName = (
        await this.characterInfoProcessor.getPlayerNames()
      )[0];
      const playerInfo = await this.characterInfoProcessor.getPlayerInfo(
        playerName
      );
      const startScene = await this.structureDataProcessor.getSceneInfo(
        (
          await this.structureDataProcessor.getScenelist()
        )[0]
      );
      await this.agentLog("初始场景信息初始化完成");
      const prompt = `你是一个TRPG游戏的Game Keeper，玩家名称为${playerName}，相关玩家信息为${JSON.stringify(
        playerInfo
      )}，相关数据含义为${
        CharacterInfoProcessor.roleFormatSpecification
      }。模组引入的初始场景为${JSON.stringify(
        startScene
      )}。请根据玩家信息和游戏模组设定，引入玩家开始游戏，注意不需要给玩家太具体的行动选项，只需要引导玩家需要采取行动即可。`;
      const introduction = await this.storyInfoProcessor.query(prompt);
      history.push({ timestamp: Date.now(), content: introduction });
      await this.plotRecordProcessor.addPlotRecord(introduction);
      await fs.writeFile(
        historyPath,
        JSON.stringify(history, null, 2),
        "utf-8"
      );
      return introduction;
    } catch (error) {
      throw new Error(
        `引入游戏时发生错误: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

export default ModuleTasks;
