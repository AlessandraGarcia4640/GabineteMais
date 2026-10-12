import Markdown, { type ASTNode } from 'react-native-markdown-display';
import { Text } from 'react-native';
import { theme } from '../lib/theme';
import { strings } from '../lib/strings';
const rules = { image: (node: ASTNode) => <Text key={node.key}>{strings.guidelines.mediaNotice}</Text> };
export function MarkdownContent({ content }: { content: string }) { return <Markdown rules={rules} onLinkPress={() => false} style={{ body: { color: theme.text, fontSize: 16, lineHeight: 24 }, link: { color: theme.primary }, fence: { backgroundColor: theme.surfacePressed, color: theme.text }, code_inline: { color: theme.text, backgroundColor: theme.surfacePressed } }}>{content}</Markdown>; }
