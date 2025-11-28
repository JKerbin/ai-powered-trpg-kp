import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { mkdir } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import ModuleTasks from "../../../agent/workflows/moduleTasks";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;
    const saveName = formData.get("saveName") as string | null;
    const characterInfoStr = formData.get("characterInfo") as string | null;
    
    // 解析角色信息
    let characterInfo = {
      NAME: "默认角色",
      STR: 60,
      CON: 45,
      SIZ: 60,
      INT: 65,
      POW: 70,
      DEX: 50,
      APP: 75,
      EDU: 65,
      SAN: 30,
      HP: 12,
      WEAPON: "",
      SKILLS: [] as string[],
      DESCRIPTION: ""
    };
    
    if (characterInfoStr) {
      try {
        characterInfo = JSON.parse(characterInfoStr);
      } catch (parseError) {
        console.error("解析角色信息失败:", parseError);
        // 使用默认值继续
      }
    }

    // 验证必要参数
    if (!file || !userId || !saveName || !characterInfo.NAME) {
      return NextResponse.json(
        { error: "缺少必要参数：文件、用户ID、存档名称或角色名称" },
        { status: 400 }
      );
    }

    // 检查文件类型
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "仅支持PDF文件格式" }, { status: 400 });
    }

    // 生成存档ID
    const saveId = uuidv4();

    // 创建用户存档目录
    const userDir = path.join(process.cwd(), "user", userId);
    const saveDir = path.join(userDir, saveId);

    // 确保目录存在
    await mkdir(userDir, { recursive: true });
    await mkdir(saveDir, { recursive: true });

    // 保存PDF文件
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfPath = path.join(saveDir, "scenario.pdf");
    await writeFile(pdfPath, buffer);

    const moduleTasks = await ModuleTasks.create(saveDir);
    // 使用从前端接收的角色信息
    await moduleTasks.initializeGame(characterInfo);
    await moduleTasks.introduceGame();

    // 创建存档元数据
    const metaData = {
      name: saveName,
      player: characterInfo.NAME, // 可以根据实际需求从请求中获取
      time: new Date().toISOString(),
      round: 0,
    };

    const metaPath = path.join(saveDir, "meta.json");
    await writeFile(metaPath, JSON.stringify(metaData, null, 2));

    // 返回成功响应
    return NextResponse.json(
      {
        success: true,
        saveId,
        message: "存档创建成功",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("创建存档时发生错误:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建存档失败" },
      { status: 500 }
    );
  }
}
