import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";

import CharacterInfoProcessor from "../processors/characterInfo.ts";
import type {
  CharacterInfo,
  CharacterInfoPartial,
} from "../processors/characterInfo.ts";
import PlotRecordProcessor from "../processors/plotRecord.ts";
import StoryInfoProcessor from "../processors/storyInfo.ts";
import StructureDataProcessor from "../processors/structureData.ts";

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
  historyPath: string;
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
    this.historyPath = path.join(this.saveFilePath, "history.json");
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
      await fs.mkdir(this.saveFilePath, { recursive: true });
      await fs.writeFile(
        this.historyPath,
        JSON.stringify([], null, 2),
        "utf-8"
      );
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
      history.push({
        timestamp: Date.now(),
        role: "Game Keeper",
        content: introduction,
      });
      await this.plotRecordProcessor.addPlotRecord(introduction);
      await fs.writeFile(
        this.historyPath,
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

  async continueGame(playerAction: string): Promise<string> {
    try {
      const history = JSON.parse(await fs.readFile(this.historyPath, "utf-8"));
      const playerName = (
        await this.characterInfoProcessor.getPlayerNames()
      )[0];
      const playerInfo = await this.characterInfoProcessor.getPlayerInfo(
        playerName
      );
      await this.agentLog("获取玩家信息完成");

      const sceneList = await this.structureDataProcessor.getScenelist();
      const sceneSelectPrompt = `玩家最近的5条行动记录为${JSON.stringify(
        history.slice(-5)
      )}，请根据玩家最近的行动记录，从${JSON.stringify(
        sceneList
      )}中判断玩家当前所在的场景。给出完全准确的场景名称，以##场景名##的格式返回。`;
      const rawScene = await this.storyInfoProcessor.query(sceneSelectPrompt);
      const sceneNameMatch = rawScene.match(/##([^#]+)##/);
      const sceneName = sceneNameMatch ? sceneNameMatch[1].trim() : "";
      const sceneInfo = await this.structureDataProcessor.getSceneInfo(
        sceneName
      );
      await this.agentLog("获取场景信息完成");

      const npclist = await this.characterInfoProcessor.getCharacterNames();
      const npcSelectPrompt = `玩家最近的5条行动记录为${JSON.stringify(
        history.slice(-5)
      )}，玩家当前所在场景信息为${JSON.stringify(
        sceneInfo
      )}，请根据玩家最近的行动记录和当前场景信息，从npcList：${JSON.stringify(
        npclist
      )}中选择出所有所有在场角色，以##["角色1","角色2",...]##的格式返回。`;
      const rawNpc = await this.storyInfoProcessor.query(npcSelectPrompt);
      const npcNameMatch = rawNpc.match(/##\["([^"]+)"\]##/);
      const npcNames = npcNameMatch ? npcNameMatch[1].trim().split(",") : [];
      const npcInfo = await Promise.all(
        npcNames.map(
          async (npcName) =>
            await this.characterInfoProcessor.getCharacterInfo(npcName)
        )
      );
      await this.agentLog("获取相关角色信息完成");

      const plotSummaryPrompt = `玩家最近的5条行动记录为${JSON.stringify(
        history.slice(-5)
      )}，玩家当前所在场景信息为${JSON.stringify(sceneInfo)}`;
      const plotSummary = await this.plotRecordProcessor.getPlotRecord(
        plotSummaryPrompt
      );
      await this.agentLog("获取剧情总结完成");

      const gamePrompt = `你是一个TRPG游戏的Game Keeper，玩家名称为${playerName}，相关玩家信息为${JSON.stringify(
        playerInfo
      )}，相关数据含义为${
        CharacterInfoProcessor.roleFormatSpecification
      }。玩家最的5条行动记录为${JSON.stringify(
        history.slice(-5)
      )}，玩家目前所在场景信息为${JSON.stringify(
        sceneInfo
      )}，与当前剧情相关的角色信息为${JSON.stringify(
        npcInfo
      )}。玩家下一步的行动为${playerAction}。请根据玩家信息和游戏模组设定，以及之间发生的剧情总结：${plotSummary}，继续游戏，注意不需要给玩家太具体的行动选项，只需要引导玩家需要采取行动即可。`;
      history.push({
        timestamp: Date.now(),
        role: "Player",
        content: playerAction,
      });
      const continueLog = await this.storyInfoProcessor.query(gamePrompt);
      history.push({
        timestamp: Date.now(),
        role: "Game Keeper",
        content: continueLog,
      });
      await this.agentLog("剧情生成完成");

      function formatCharacterInfo(data: string) {
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

      const updatePlayerInfoPrompt = `请根据${continueLog}，更新${playerName}的信息。更新信息按照${CharacterInfoProcessor.roleFormatSpecification}格式返回。`;
      const updatePlayerInfoRaw = await this.storyInfoProcessor.query(
        updatePlayerInfoPrompt
      );
      const [updatePlayerInfo, _] = formatCharacterInfo(updatePlayerInfoRaw);
      const [validUpdatePlayerInfo, __] =
        this.characterInfoProcessor.verifyCharacterInfo(updatePlayerInfo);
      if (validUpdatePlayerInfo.length !== 0) {
        await this.characterInfoProcessor.modifyPlayerInfo(
          playerName,
          validUpdatePlayerInfo[0]
        );
      }
      this.agentLog("更新玩家信息完成");

      await Promise.all(
        npcNames.map(async (npcName) => {
          const updateNpcInfoPrompt = `请根据${continueLog}，更新${npcName}的信息。更新信息按照[${CharacterInfoProcessor.roleFormatSpecification}]格式返回。`;
          const updateInfoRaw = await this.storyInfoProcessor.query(
            updateNpcInfoPrompt
          );
          const [updateInfo, _] = formatCharacterInfo(updateInfoRaw);
          const [validUpdateInfo, __] =
            this.characterInfoProcessor.verifyCharacterInfo(updateInfo);
          if (validUpdateInfo.length !== 0) {
            await this.characterInfoProcessor.modifyCharacterInfo(
              npcName,
              validUpdateInfo[0]
            );
          }
        })
      );
      this.agentLog("更新角色信息完成");

      await this.plotRecordProcessor.addPlotRecord(continueLog);
      await fs.writeFile(
        this.historyPath,
        JSON.stringify(history, null, 2),
        "utf-8"
      );
      return continueLog;
    } catch (error) {
      throw new Error(
        `继续游戏时发生错误: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

export default ModuleTasks;
