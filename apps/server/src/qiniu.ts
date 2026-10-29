import { createHmac } from "node:crypto";
import { MAX_SKILL_ZIP_BYTES } from "../../../packages/contracts/src/index";
import { ApiError } from "./errors";

interface QiniuConfig {
  accessKey: string;
  secretKey: string;
  bucket: string;
  uploadUrl: string;
  downloadUrl: string;
  resourceUrl: string;
}

const base64 = (value: string | Buffer) =>
  Buffer.from(value).toString("base64").replace(/\+/g, "-").replace(/\//g, "_");

export class QiniuStorage {
  constructor(private config: QiniuConfig) {}

  private sign(value: string) {
    if (!this.config.accessKey || !this.config.secretKey || !this.config.bucket) {
      throw new ApiError(503, "请配置七牛 QINIU_ACCESS_KEY、QINIU_SECRET_KEY 和 QINIU_BUCKET");
    }
    return base64(createHmac("sha1", this.config.secretKey).update(value).digest());
  }

  upload(fileId: string, key: string) {
    const policy = base64(
      JSON.stringify({
        scope: `${this.config.bucket}:${key}`,
        deadline: Math.floor(Date.now() / 1000) + 600,
        insertOnly: 1,
        fsizeLimit: MAX_SKILL_ZIP_BYTES,
      }),
    );
    return {
      fileId,
      key,
      uploadUrl: this.config.uploadUrl,
      token: `${this.config.accessKey}:${this.sign(policy)}:${policy}`,
    };
  }

  download(key: string) {
    if (!this.config.downloadUrl) {
      throw new ApiError(503, "请配置七牛 QINIU_DOWNLOAD_URL");
    }
    const url = `${this.config.downloadUrl.replace(/\/$/, "")}/${key}?e=${Math.floor(Date.now() / 1000) + 600}`;
    return `${url}&token=${this.config.accessKey}:${this.sign(url)}`;
  }

  private async request(method: "GET" | "POST", action: string, key: string) {
    const entry = base64(`${this.config.bucket}:${key}`);
    const url = new URL(`/${action}/${entry}`, this.config.resourceUrl);
    const contentType = "application/x-www-form-urlencoded";
    const signature = this.sign(
      `${method} ${url.pathname}\nHost: ${url.host}\nContent-Type: ${contentType}\n\n`,
    );
    const result = await fetch(url, {
      method,
      headers: {
        Authorization: `Qiniu ${this.config.accessKey}:${signature}`,
        "Content-Type": contentType,
      },
    });
    if (!result.ok && !(action === "delete" && result.status === 612)) {
      const body = (await result.json()) as { error?: string };
      throw new ApiError(
        502,
        `七牛${action === "stat" ? "查询" : "删除"}失败：${body.error ?? result.status}`,
      );
    }
  }

  stat(key: string) {
    return this.request("GET", "stat", key);
  }

  delete(key: string) {
    return this.request("POST", "delete", key);
  }
}
