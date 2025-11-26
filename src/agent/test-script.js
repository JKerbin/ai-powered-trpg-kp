import ModuleTasks from "./workflows/moduleTasks.ts";

async function main() {
  const moduleTasks = await ModuleTasks.create("./save/test");
  // await moduleTasks.initializeGame({
  //   "NAME": "乔瑟夫",
  //   "STR": 60,
  //   "CON": 45,
  //   "SIZ": 60,
  //   "INT": 65,
  //   "POW": 70,
  //   "DEX": 50,
  //   "APP": 75,
  //   "EDU": 65,
  //   "SAN": 30,
  //   "HP": 12,
  //   "WEAPON": "曼纽因转轮枪",
  //   "SKILLS": [
  //     "克苏鲁神话",
  //     "议价",
  //     "躲闪",
  //     "快速交谈",
  //     "聆听",
  //     "侦查"
  //   ],
  //   "DESCRIPTION": "西蒙的弟弟，是一名退伍士兵，外表帅气魁梧。"
  // });
  // const intro = await moduleTasks.introduceGame();
  // console.log(intro);

  const continueGameResult = await moduleTasks.continueGame("获得了信件的内容");
  console.log(continueGameResult);
}

main().catch((error) => {
  console.error("程序执行出错:", error);
  process.exit(1);
});