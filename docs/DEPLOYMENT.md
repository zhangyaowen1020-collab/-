# 云端部署（Vercel）

此项目会把任务与图片保存到你的新加坡 Supabase 项目；图片桶保持私有。请勿把任何密钥粘贴进聊天、代码仓库或浏览器前端。

## 1. 在本机生成两个 APP 私密值

在 cloud-workbench 文件夹的终端运行：

~~~powershell
npm run generate:secrets
~~~

输入团队使用的固定密码。终端只会在本机显示两行值：APP_PASSWORD_HASH 和 SESSION_SECRET。复制它们到安全的临时位置；密码不会被本项目保存。

## 2. 创建 Vercel 项目

1. 登录 https://vercel.com/ 。
2. 新建项目并导入此代码仓库；Root Directory 保持默认的 `./`（仓库根目录）。
3. 在 Settings → Environment Variables 选择 Production 和 Preview，添加以下四项：

| 名称 | 填什么 |
| --- | --- |
| SUPABASE_URL | 你的 Supabase Project URL，例如 https://项目标识.supabase.co |
| SUPABASE_SERVICE_ROLE_KEY | Supabase 秘密密钥（以 sb_secret_ 开头），仅粘贴到 Vercel |
| APP_PASSWORD_HASH | 第 1 步脚本输出的等号右侧内容 |
| SESSION_SECRET | 第 1 步脚本输出的等号右侧内容 |

不要添加任何 NEXT_PUBLIC_ 前缀，不要使用 publishable key 替代秘密密钥。

## 3. 部署和验收

点击 Deploy，得到 *.vercel.app 地址。先在 Preview 验收，再发布 Production：

1. 用固定密码登录。
2. 新建当天任务，添加一个任务组。
3. 上传模特图、上装和下装。
4. 复制基准交接文本，手动粘贴给 ChatGPT 或 Codex。
5. 将结果按合同文件名上传；尺寸不符会显示技术 FAIL。
6. 技术 PASS 的图片才能点击“快速通过”。
7. 从另一台设备同时打开并编辑，旧版本写入应提示刷新。

## 数据库迁移

首次部署图片预览、每组最多 5 张模特图和“一套换装”前，请在 Supabase SQL Editor 运行 `supabase/migrations/0006_full_look_and_model_limit.sql` 的完整内容，再重新部署 Vercel。

## 密钥轮换

如果密钥或密码外泄：立即在 Supabase 轮换秘密密钥、重新运行生成脚本设置新密码，然后在 Vercel 更新对应变量并重新部署。更换 SESSION_SECRET 会让旧登录全部失效。
