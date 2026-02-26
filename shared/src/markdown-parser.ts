/**
 * Agent Monitor - Markdown 파서
 *
 * 에이전트 마크다운 파일에서 메타데이터 추출
 */

import type { AvailableAgentInfo } from './types.js';

/**
 * YAML frontmatter에서 메타데이터 추출
 */
export interface MarkdownMetadata {
  description: string;
  model?: string;
}

/**
 * 에이전트 마크다운 파일 파싱
 *
 * @param content - 마크다운 파일 내용
 * @returns 파싱된 메타데이터 (description, model)
 */
export function parseMarkdownMetadata(content: string): MarkdownMetadata {
  let description = '';
  let model: string | undefined;

  // YAML frontmatter 파싱
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];

    // description 추출
    const descMatch = frontmatter.match(/description:\s*["']?(.+?)["']?\s*(?:\n|$)/);
    if (descMatch) {
      description = descMatch[1].trim();
    }

    // model 추출
    const modelMatch = frontmatter.match(/model:\s*["']?(.+?)["']?\s*(?:\n|$)/);
    if (modelMatch) {
      model = modelMatch[1].trim();
    }
  }

  // description이 없으면 첫 번째 제목 아래 텍스트 사용
  if (!description) {
    const firstParagraph = content.match(/^#[^\n]+\n+([^\n#]+)/m);
    if (firstParagraph) {
      description = firstParagraph[1].trim().slice(0, 100);
    }
  }

  return { description, model };
}

/**
 * 에이전트 마크다운 파일에서 AvailableAgentInfo 생성
 *
 * @param name - 에이전트 이름 (파일명에서 추출)
 * @param content - 마크다운 파일 내용
 * @param source - 에이전트 소스 ('omc' | 'custom')
 * @returns AvailableAgentInfo 객체
 */
export function parseAgentMarkdown(
  name: string,
  content: string,
  source: 'omc' | 'custom'
): AvailableAgentInfo {
  const metadata = parseMarkdownMetadata(content);

  return {
    name,
    description: metadata.description || `${name} agent`,
    model: metadata.model,
    source,
  };
}

/**
 * 파일명이 유효한 에이전트 파일인지 확인
 * (템플릿 파일 등 제외)
 */
export function isValidAgentFile(filename: string): boolean {
  const name = filename.replace('.md', '');

  // 템플릿 파일 제외
  if (name === 'base-agent' || name.startsWith('template')) {
    return false;
  }

  // .md 확장자 확인
  if (!filename.endsWith('.md')) {
    return false;
  }

  return true;
}
