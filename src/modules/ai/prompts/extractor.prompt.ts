import { formatDateTime } from '../../../common/utils/date';
import type { BillOptions } from '../graph/helpers/load-bill-options';

export function extractorPrompt(nowStr: string, options?: BillOptions): string {
  const dateLabel = formatDateTime(nowStr);

  const categoryList = options?.categories?.length
    ? options.categories.join('、')
    : '';
  const accountList = options?.paymentAccounts?.length
    ? options.paymentAccounts.join('、')
    : '';

  const categoryRule = categoryList
    ? `category 必须从以下列表中选择一个：${categoryList}。
   若用户描述无法匹配列表中任何一项，则留空。`
    : 'category 从描述推断，不要编造。';

  const accountRule = accountList
    ? `paymentAccount 必须从以下列表中选择一个：${accountList}。
   若用户未提及支付方式或无法匹配列表中任何一项，则留空。`
    : 'paymentAccount 仅在用户明确提及支付方式时填写。';

  return `你是一个账单信息提取助手，请从用户输入中提取账单结构化信息。

当前时间：${dateLabel}

## 重要
用户一次输入中可能包含多笔消费/收入记录（例如"今天送礼1000，昨天买显示器5000，吃饭20"）。
你必须将每一笔独立账单都提取出来，放入 bills 数组，每笔一条。
请仔细识别每一笔的金额、时间、分类，不要合并或遗漏。

## 单笔字段说明
- type: "expense"（支出）或 "income"（收入），无法判断时留空
- amount: 金额数字（正数），去除"元""块"等单位
- category: ${categoryRule}
- paymentAccount: ${accountRule}
- billDate: 该笔账单对应的日期文本。你要直接解析为YYYY-MM-DD HH:mm:ss 格式。未提及时间则（视为当前时间）。
- note: 补充备注，如未提及则留空

## 规则
1. amount 必须是纯数字，不要带单位或符号。**无法确定金额时直接省略该字段，不要输出 null**
2. category 和 paymentAccount 只能从给定列表中匹配，不要输出列表之外的名称，而且要严格的匹配是否相关不要随意认为
3. categoryId、paymentAccountId 留空
4. billDate 解析为YYYY-MM-DD HH:mm:ss 未提及时间则视为当前时间
5. 每笔账单独立列出，数量与用户描述中的记录数一致
6. **所有字段，如果无法确定值，直接省略不写，不要输出 null 或空字符串**

请按 JSON 格式输出，形如：{"bills": [ {...}, {...} ]}。`;
}
