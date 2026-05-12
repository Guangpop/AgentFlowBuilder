---
name: お孫さんへのお祝いメッセージ
nodes:
  - id: ask_occasion
    type: UserInput
    title: お祝いのきっかけを聞く
    outputs: [occasion]
    next: [ask_details]
    position: {x: 250, y: 80}
  - id: ask_details
    type: AgentQuestion
    title: 詳しい情報を聞く
    inputs: [occasion]
    outputs: [question_to_user]
    next: [receive_details]
    position: {x: 250, y: 280}
  - id: receive_details
    type: UserResponse
    title: お返事を受け取る
    inputs: [question_to_user]
    outputs: [details]
    next: [check_occasion]
    position: {x: 250, y: 480}
  - id: check_occasion
    type: Condition
    title: お誕生日かどうか
    inputs: [occasion, details]
    outputs: [is_birthday]
    next: {"true": write_birthday_message, "false": write_school_message}
    position: {x: 250, y: 680}
  - id: write_birthday_message
    type: AgentAction
    title: お誕生日メッセージを書く
    inputs: [details]
    outputs: [message]
    next: [deliver_message]
    position: {x: 50, y: 880}
  - id: write_school_message
    type: AgentAction
    title: 入学・卒業のお祝いメッセージを書く
    inputs: [details]
    outputs: [message]
    next: [deliver_message]
    position: {x: 450, y: 880}
  - id: deliver_message
    type: UserResponse
    title: メッセージをお見せする
    inputs: [message]
    outputs: [final_message]
    next: []
    position: {x: 250, y: 1080}
---

# お孫さんへのお祝いメッセージ

お孫さんへの「お誕生日おめでとう」や「ご入学おめでとう」のメッセージを書くのを、AI がお手伝いします。

AI は **ものを考えてくれるお手伝いさん** のようなものだと思ってください。お話しかけると、ちゃんと聞いて、考えて、お返事してくれます。

下の流れは「**話しかけ → 質問 → お返事 → 文章を書く**」という、お手伝いさんと一緒にお手紙を作る順番です。

## お祝いのきっかけを聞く {#ask_occasion}

最初に、何のお祝いかを教えていただきます。

- 「お誕生日」
- 「入学」
- 「卒業」

このどれかを、そのまま話しかけるか、文字でお伝えください。AI が受け取って、次の質問を考えます。

## 詳しい情報を聞く {#ask_details}

AI が「もう少し詳しく教えてください」と聞いてきます。優しい言い方でお聞きしますので、ご安心ください。

- **お誕生日の場合**：お孫さんは何歳になられますか？
- **入学・卒業の場合**：何年生になりますか？

なぜ聞くかというと、6 歳のお孫さんと 18 歳のお孫さんでは、使う言葉を変えた方が喜ばれるからです。

## お返事を受け取る {#receive_details}

あなたのお返事（例：「6 歳になります」）を、AI が聞き取ります。

聞き間違えても大丈夫です。あとで書き直してもらえます。

## お誕生日かどうか {#check_occasion}

ここで AI が **道を分けます**。

- 「お誕生日」とお答えだったら → **左の道** へ進み、お誕生日用の文を書きます
- 「入学」「卒業」だったら → **右の道** へ進み、お祝い文を書きます

人で言えば、お手伝いさんが「今日は子供向けの言葉にしよう」「今日は大人びた言葉にしよう」と判断しているのと同じです。

## お誕生日メッセージを書く {#write_birthday_message}

お誕生日用の温かいメッセージを AI が書いてくれます。

例（6 歳のお孫さんの場合）：

> 〇〇ちゃん、お誕生日おめでとう。
> 元気いっぱい、楽しい一年になりますように。
> おじいちゃん・おばあちゃんはいつも〇〇ちゃんを応援しています。

このような文章を、お孫さんの年齢に合わせて作ってくれます。

## 入学・卒業のお祝いメッセージを書く {#write_school_message}

入学・卒業のお祝い文を AI が書いてくれます。

例（小学校入学の場合）：

> 〇〇さん、ご入学おめでとうございます。
> 新しいお友達と楽しい毎日を過ごせますように。
> 心からお祝い申し上げます。

学年に合わせて、子供らしい言葉と大人らしい言葉を使い分けてくれます。

## メッセージをお見せする {#deliver_message}

最後に、AI が書いた文章を画面に出してくれます。

そのままお気に召せば、**LINE** や **お葉書** にコピーしてお送りいただけます。気に入らないところがあれば、「ここをこう書き直して」と話しかければ、もう一度書き直してもらえます。

これで完成です。
