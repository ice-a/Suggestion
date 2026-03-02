# MongoDB Atlas 配置指南

## 步骤 1: 创建 MongoDB Atlas 账号
1. 访问 https://www.mongodb.com/cloud/atlas
2. 注册免费账号
3. 创建免费集群 (Free Tier)

## 步骤 2: 获取连接字符串
1. 在 Atlas 面板，点击 "Connect"
2. 选择 "Connect your application"
3. 复制连接字符串，格式类似：
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/suggestions?retryWrites=true&w=majority
   ```

## 步骤 3: 配置 .env 文件
编辑项目根目录的 `.env` 文件：
```
MONGODB_URI=你的连接字符串
PORT=3000
```

**注意**: 将 `<username>` 和 `<password>` 替换为你的数据库用户名和密码。

## 步骤 4: 运行项目
```bash
npm install
npm start
```

访问 http://localhost:3000

## API 说明
- `POST /api/suggestions` - 提交建议
- `GET /api/suggestions/:id` - 查询建议进度
