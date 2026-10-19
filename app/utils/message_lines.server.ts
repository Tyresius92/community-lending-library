export interface MessageLine {
  offset: number;
  text: string;
}

export function splitIntoLines(body: string): MessageLine[] {
  const lines: MessageLine[] = [];
  const pattern = /\r?\n/g;
  let offset = 0;
  for (const match of body.matchAll(pattern)) {
    lines.push({ offset, text: body.slice(offset, match.index) });
    offset = match.index + match[0].length;
  }
  lines.push({ offset, text: body.slice(offset) });
  return lines;
}
