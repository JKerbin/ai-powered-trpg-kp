import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 定义存档元数据接口
interface SaveMeta {
  name: string;
  player: string;
  time: string;
  round: number;
}

// 定义存档项接口
interface SaveItem {
  saveId: string;
  meta: SaveMeta;
}

export async function GET(request: NextRequest) {
  try {
    // 从请求URL中获取userId参数
    const userId = request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: '缺少userId参数' },
        { status: 400 }
      );
    }

    // 构建用户文件夹路径
    const userFolderPath = path.join(process.cwd(), 'user', userId);
    
    // 检查用户文件夹是否存在
    if (!fs.existsSync(userFolderPath)) {
      return NextResponse.json(
        { error: '用户文件夹不存在' },
        { status: 404 }
      );
    }

    // 读取用户文件夹下的所有存档文件夹
    const saveFolders = fs.readdirSync(userFolderPath).filter(item => {
      const itemPath = path.join(userFolderPath, item);
      return fs.statSync(itemPath).isDirectory();
    });

    // 获取每个存档的元数据
    const saves: SaveItem[] = [];
    
    for (const saveId of saveFolders) {
      const metaFilePath = path.join(userFolderPath, saveId, 'meta.json');
      
      if (fs.existsSync(metaFilePath)) {
        try {
          const metaContent = fs.readFileSync(metaFilePath, 'utf-8');
          const meta: SaveMeta = JSON.parse(metaContent);
          
          saves.push({ saveId, meta });
        } catch (error) {
          console.error(`读取存档 ${saveId} 的元数据失败:`, error);
          // 跳过无法读取的存档
          continue;
        }
      }
    }

    // 返回存档列表
    return NextResponse.json({
      userId,
      saves,
      total: saves.length
    });

  } catch (error) {
    console.error('获取存档列表失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}