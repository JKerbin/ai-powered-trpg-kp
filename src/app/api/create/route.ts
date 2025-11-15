import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { mkdir } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;
    const saveName = formData.get('saveName') as string | null;

    // 验证必要参数
    if (!file || !userId || !saveName) {
      return NextResponse.json(
        { error: '缺少必要参数：文件、用户ID或存档名称' },
        { status: 400 }
      );
    }

    // 检查文件类型
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: '仅支持PDF文件格式' },
        { status: 400 }
      );
    }

    // 生成存档ID
    const saveId = uuidv4();
    
    // 创建用户存档目录
    const userDir = path.join(process.cwd(), 'user', userId);
    const saveDir = path.join(userDir, saveId);
    
    // 确保目录存在
    await mkdir(userDir, { recursive: true });
    await mkdir(saveDir, { recursive: true });
    
    // 保存PDF文件
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfPath = path.join(saveDir, `${saveId}.pdf`);
    await writeFile(pdfPath, buffer);
    
    // 创建存档元数据
    const metaData = {
      name: saveName,
      player: '未知玩家', // 可以根据实际需求从请求中获取
      time: new Date().toISOString(),
      round: 1
    };
    
    const metaPath = path.join(saveDir, 'meta.json');
    await writeFile(metaPath, JSON.stringify(metaData, null, 2));
    
    // 返回成功响应
    return NextResponse.json({
      success: true,
      saveId,
      message: '存档创建成功'
    }, { status: 200 });
  } catch (error) {
    console.error('创建存档时发生错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建存档失败' },
      { status: 500 }
    );
  }
}