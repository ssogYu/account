import { formatDateTime } from '../../../common/utils/date';
import type { BillOptions } from '../graph/helpers/load-bill-options';

export function extractorPrompt(
  nowStr: string,
  options?: BillOptions,
  hasImages?: boolean,
): string {
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

  const imageInstruction = hasImages
    ? `\n## 首要任务：图片识别\n本次输入包含账单图片，你必须仔细观察图片内容进行提取。\n- 以图片内容为最高优先级，文字描述仅作辅助参考\n- 常见类型：支付截图、外卖/超市小票、餐厅结账单、手写收据等\n- 仔细辨认金额数字，注意小数点和千位分隔符\n- 从图片中提取日期、商户名、商品名作为分类和备注的线索`
    : '';

  return `你是一个账单信息提取助手，请从用户输入中提取账单结构化信息。
${imageInstruction}

当前时间：${dateLabel}

## 重要
用户一次输入中可能包含多笔消费/收入记录（例如"今天送礼1000，昨天买显示器5000，吃饭20"）。
你必须将每一笔独立账单都提取出来，放入 bills 数组，每笔一条。
请仔细识别每一笔的金额、时间、分类，不要合并或遗漏。

## 去重规则（重要）
同一批输入中若存在重复账单（例如用户重复描述同一笔消费，或一次上传多张相同/相近的图片），必须去重合并，只保留一条。
判重标准：当两笔账单的「金额 amount + 类型 type + 分类 category + 时间 billDate（精确到时分，秒忽略）」完全一致时，视为同一笔重复账单。
- 仅合并满足上述全部条件完全一致的账单，其余情况（金额不同、分类不同、时间不同）不得合并。
- 合并时保留一条，其余丢弃，bills 数组中该账单只出现一次。
- 若多笔账单时间相近但金额/分类不同，属于不同账单，正常分别列出。

## 单笔字段说明
- type: "expense"（支出）或 "income"（收入），无法判断时留空
- amount: 金额数字（正数），去除"元""块"等单位
- category: ${categoryRule}
- paymentAccount: ${accountRule}
- billDate: 该笔账单对应的日期文本。你要直接解析为YYYY-MM-DD HH:mm:ss 格式。未提及时间则（视为当前时间）。
- note: 备注信息这个消息可以是账单的名称和描述，如未提及则留空

## 规则
1. amount 必须是纯数字，不要带单位或符号。**无法确定金额时直接省略该字段，不要输出 null**
2. category 和 paymentAccount 必须且只能从上述列表中取值，这是硬性规定。绝对禁止输出任何不在列表中的名称，也绝对禁止自己编造、推测、近似匹配。如果用户描述跟列表里的每一项都不相关，就不要填这个字段，直接省略。记住：缺字段可以后续让用户补充，填错了就没办法了。
3. categoryId、paymentAccountId 留空
4. billDate 解析为YYYY-MM-DD HH:mm:ss 未提及时间则视为当前时间
5. 每笔账单独立列出，数量与用户描述中的记录数一致
6. **所有字段，如果无法确定值，直接省略不写，不要输出 null 或空字符串**
7. 若多笔账单满足去重规则（金额、类型、分类相同且时间在同一分钟内），只输出一条，不要重复输出

请按 JSON 格式输出，形如：{"bills": [ {...}, {...} ]}。`;
}
