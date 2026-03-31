<script lang="ts" setup>
import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Col,
  Image,
  Row,
  Space,
  Typography,
} from 'ant-design-vue';

const CONTRIBUTORS_URL = 'https://github.com/QingYingX-Bot/guoba-plugin/graphs/contributors';
const CONTRIBUTORS_IMAGE_URL = 'https://contrib.rocks/image?repo=QingYingX-Bot/guoba-plugin&max=1000';
const PROJECT_LINKS: Array<{
  desc: string;
  gitee: string;
  github: string;
  name: string;
}> = [
  {
    name: '原 Guoba-Plugin',
    desc: 'Guoba 插件原始项目与历史维护仓库',
    gitee: 'https://gitee.com/guoba-yunzai/guoba-plugin',
    github: 'https://github.com/QingYingX-Bot/guoba-plugin',
  },
  {
    name: 'TRSS-Yunzai',
    desc: 'TRSS-Yunzai 主仓库',
    gitee: 'https://gitee.com/TimeRainStarSky/Yunzai',
    github: 'https://github.com/TimeRainStarSky/Yunzai',
  },
  {
    name: 'Miao-Plugin',
    desc: '喵喵插件仓库',
    gitee: 'https://github.com/yoimiya-kokomi/miao-plugin',
    github: 'https://github.com/yoimiya-kokomi/miao-plugin',
  },
  {
    name: 'Yunzai插件索引',
    desc: 'Yunzai 生态插件索引仓库',
    gitee: 'https://gitee.com/yhArcadia/Yunzai-Bot-plugins-index',
    github: 'https://github.com/yhArcadia/Yunzai-Bot-plugins-index',
  },
];

</script>

<template>
  <Page auto-content-height content-class="about-page-content">
    <Space direction="vertical" :size="16" class="about-wrap">
      <Card class="about-hero-card">
        <Row :gutter="[20, 20]" align="middle">
          <Col :span="24">
            <Typography.Text class="about-kicker">Guoba Fork</Typography.Text>
            <Typography.Title :level="2" class="about-title">
              关于页面
            </Typography.Title>
            <Typography.Paragraph class="about-desc">
              Guoba Fork 是 Yunzai-Bot 的后台管理插件，提供插件管理、配置编辑与可视化操作能力。
              这个页面用于集中展示项目地址与贡献者信息。
            </Typography.Paragraph>

          </Col>
        </Row>
      </Card>

      <Row :gutter="[16, 16]">
        <Col :lg="12" :md="24" :xs="24">
          <Card class="about-card contributors-card">
            <Row justify="space-between" align="top" :gutter="[8, 8]">
              <Col flex="auto">
                <Typography.Title :level="5">
                  💖 感谢贡献者
                </Typography.Title>
                <Typography.Paragraph>
                  感谢所有为 guoba-plugin 添砖加瓦的开发者们！🎉 你们都是最棒的！
                </Typography.Paragraph>
              </Col>
              <Col>
                <a :href="CONTRIBUTORS_URL" target="_blank" rel="noreferrer">
                  <Button type="link">查看全部</Button>
                </a>
              </Col>
            </Row>

            <a :href="CONTRIBUTORS_URL" target="_blank" rel="noreferrer">
              <Image
                :src="CONTRIBUTORS_IMAGE_URL"
                alt="guoba-plugin contributors"
                :preview="false"
              />
            </a>
          </Card>
        </Col>

        <Col :lg="12" :md="24" :xs="24">
          <Card class="about-card project-card" title="项目信息">
            <Typography.Paragraph class="project-tip">
              相关项目与生态仓库
            </Typography.Paragraph>
            <Row :gutter="[12, 12]" class="project-cards">
              <Col
                v-for="project in PROJECT_LINKS"
                :key="project.name"
                :lg="12"
                :md="12"
                :sm="12"
                :xs="24"
              >
                <Card size="small" class="project-repo-card">
                  <div class="repo-head">
                    <Typography.Text class="project-item-name" strong>
                      {{ project.name }}
                    </Typography.Text>
                    <Space :size="6" class="repo-host-badges">
                      <Typography.Text class="repo-host repo-host-gitee">Gitee</Typography.Text>
                      <Typography.Text class="repo-host repo-host-github">GitHub</Typography.Text>
                    </Space>
                  </div>
                  <Typography.Paragraph class="project-item-desc">
                    {{ project.desc }}
                  </Typography.Paragraph>
                  <div class="repo-links">
                    <a :href="project.gitee" target="_blank" rel="noreferrer" class="repo-link-text">
                      {{ project.gitee.replace('https://', '') }}
                    </a>
                    <a :href="project.github" target="_blank" rel="noreferrer" class="repo-link-text">
                      {{ project.github.replace('https://', '') }}
                    </a>
                  </div>
                  <Space wrap size="small" class="repo-actions">
                    <Button
                      size="small"
                      shape="round"
                      :href="project.gitee"
                      target="_blank"
                      rel="noreferrer"
                    >
                      打开 Gitee
                    </Button>
                    <Button
                      size="small"
                      shape="round"
                      type="primary"
                      ghost
                      :href="project.github"
                      target="_blank"
                      rel="noreferrer"
                    >
                      打开 GitHub
                    </Button>
                  </Space>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </Space>
  </Page>
</template>

<style scoped>
:deep(.about-page-content) {
  min-height: 0;
}

.about-wrap {
  width: 100%;
}

.about-card,
.about-hero-card {
  border-radius: 14px;
  border: 1px solid hsl(var(--border) / 80%);
}

.about-hero-card {
  background: linear-gradient(
    135deg,
    hsl(var(--background)) 0%,
    hsl(var(--muted) / 58%) 100%
  );
}

.about-kicker {
  color: hsl(var(--primary));
  font-size: 12px;
  font-weight: 600;
}

.about-title {
  margin: 2px 0 8px !important;
}

.about-desc {
  margin-bottom: 8px !important;
  color: hsl(var(--muted-foreground));
}

.about-card :deep(.ant-card-head) {
  min-height: 50px;
}

.project-card :deep(.ant-card-body) {
  padding-top: 14px;
}

.project-tip {
  margin-bottom: 12px !important;
  color: hsl(var(--muted-foreground));
}

.project-cards {
  width: 100%;
}

.project-repo-card {
  border-radius: 12px;
  border: 1px solid hsl(var(--border) / 80%);
  background: hsl(var(--background));
}

.project-repo-card :deep(.ant-card-body) {
  padding: 14px;
}

.repo-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.repo-host-badges {
  flex-shrink: 0;
}

.repo-host {
  display: inline-block;
  border-radius: 999px;
  border: 1px solid hsl(var(--border));
  padding: 0 8px;
  font-size: 12px;
  line-height: 20px;
  background: hsl(var(--muted) / 36%);
}

.repo-host-gitee {
  color: hsl(165 70% 30%);
}

.repo-host-github {
  color: hsl(var(--primary));
}

.project-item-name {
  font-size: 15px;
  line-height: 1.4;
}

.project-item-desc {
  display: block;
  margin: 8px 0 10px !important;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.repo-links {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.repo-link-text {
  color: hsl(var(--foreground) / 82%);
  font-size: 12px;
  line-height: 1.35;
  word-break: break-all;
}

.repo-actions {
  width: 100%;
}
</style>
