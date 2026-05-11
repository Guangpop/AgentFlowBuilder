---
name: 客服智能助手
nodes:
  - id: receive_customer_input
    type: UserInput
    title: Receive Customer Input
    outputs: [customer_message]
    next: [classify_intent]
    position: {x: 100, y: 100}
  - id: classify_intent
    type: AgentReasoning
    title: Classify Intent
    inputs: [customer_message]
    outputs: [intent_category, sentiment_score, urgency_level]
    next: [check_urgency]
    position: {x: 550, y: 100}
  - id: check_urgency
    type: Condition
    title: Check Urgency
    inputs: [urgency_level, sentiment_score]
    outputs: [is_urgent]
    next: {"true": escalate_to_human, "false": search_knowledge_base}
    position: {x: 1000, y: 100}
  - id: search_knowledge_base
    type: MCPTool
    title: Search Knowledge Base
    inputs: [customer_message, intent_category]
    outputs: [search_results, confidence_score]
    next: [check_confidence]
    position: {x: 100, y: 450}
    config: {toolName: knowledge_base_search}
  - id: check_confidence
    type: Condition
    title: Check Confidence
    inputs: [confidence_score]
    outputs: [is_confident]
    next: {"true": generate_response, "false": ask_clarification}
    position: {x: 550, y: 450}
  - id: generate_response
    type: AgentAction
    title: Generate Response
    inputs: [search_results, customer_message, intent_category]
    outputs: [agent_response]
    next: [check_resolved]
    position: {x: 1000, y: 450}
  - id: ask_clarification
    type: AgentQuestion
    title: Ask Clarification
    inputs: [customer_message, search_results]
    outputs: [clarification_question]
    next: [receive_clarification]
    position: {x: 100, y: 800}
  - id: receive_clarification
    type: UserResponse
    title: Receive Clarification
    inputs: [clarification_question]
    outputs: [clarification_answer]
    next: [search_knowledge_base]
    position: {x: 550, y: 800}
  - id: check_resolved
    type: AgentQuestion
    title: Check Resolved
    inputs: [agent_response]
    outputs: [resolution_question]
    next: [customer_feedback]
    position: {x: 1000, y: 800}
  - id: customer_feedback
    type: UserResponse
    title: Customer Feedback
    inputs: [resolution_question]
    outputs: [is_resolved_answer]
    next: [evaluate_resolution]
    position: {x: 100, y: 1150}
  - id: evaluate_resolution
    type: Condition
    title: Evaluate Resolution
    inputs: [is_resolved_answer]
    outputs: [resolved]
    next: {"true": collect_satisfaction, "false": escalate_to_human}
    position: {x: 550, y: 1150}
  - id: escalate_to_human
    type: AgentAction
    title: Escalate To Human
    inputs: [customer_message, intent_category, search_results]
    outputs: [escalation_ticket]
    next: [collect_satisfaction]
    position: {x: 1000, y: 1150}
  - id: collect_satisfaction
    type: AgentQuestion
    title: Collect Satisfaction
    inputs: [escalation_ticket, agent_response]
    outputs: [satisfaction_question]
    next: [record_feedback]
    position: {x: 100, y: 1500}
  - id: record_feedback
    type: ScriptExecution
    title: Record Feedback
    inputs: [satisfaction_question, intent_category, customer_message]
    outputs: [feedback_record]
    next: []
    position: {x: 550, y: 1500}
    config: {scriptType: python}
---

# 客服智能助手

智能客服 Agent，能自動接收客戶問題、分類意圖、查詢知識庫回答，無法解決時轉接人工客服，並在結束後收集滿意度回饋。

## Receive Customer Input (edited) {#receive_customer_input}

接收客戶的問題或請求

## Classify Intent {#classify_intent}

分析客戶訊息，分類問題意圖（產品諮詢、技術支援、帳號問題、投訴建議、退換貨）

## Check Urgency {#check_urgency}

判斷是否為緊急或高情緒問題（urgency_level >= high 或 sentiment_score < 0.3）

## Search Knowledge Base {#search_knowledge_base}

根據意圖分類查詢知識庫，搜尋相關解答

## Check Confidence {#check_confidence}

判斷知識庫搜尋結果的信心度是否足夠（confidence_score >= 0.7）

## Generate Response {#generate_response}

根據知識庫結果生成專業、友善的回覆訊息

## Ask Clarification {#ask_clarification}

信心度不足時，向客戶提出釐清問題以獲取更多資訊

## Receive Clarification {#receive_clarification}

接收客戶的補充回答

## Check Resolved {#check_resolved}

詢問客戶問題是否已解決

## Customer Feedback {#customer_feedback}

客戶回覆問題是否已解決

## Evaluate Resolution {#evaluate_resolution}

判斷客戶是否確認問題已解決

## Escalate To Human {#escalate_to_human}

將對話轉接給人工客服，附上完整對話摘要與問題分類

## Collect Satisfaction {#collect_satisfaction}

請客戶對本次服務進行滿意度評分（1-5 分）

## Record Feedback {#record_feedback}

記錄客戶滿意度評分與對話摘要到資料庫

### config.scriptContent

```python
# Record customer feedback to database
import json
feedback = {
  'intent': intent_category,
  'satisfaction': satisfaction_score,
  'summary': conversation_summary
}
print(json.dumps(feedback))
```
