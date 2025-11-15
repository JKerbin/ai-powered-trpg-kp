import { Suspense, lazy } from "react";
import "./page.scss";

// 动态导入客户端组件，避免在服务端预渲染时使用客户端钩子
const ClientSaveList = lazy(() => import("./client-save-list"));

// 主组件 - 服务端渲染
export default function SaveList() {
  return (
    <Suspense
      fallback={
        <div className="saveList-container">
          <div className="saveList-content">
            <div className="loading-message">加载中...</div>
          </div>
        </div>
      }
    >
      <ClientSaveList />
    </Suspense>
  );
}
