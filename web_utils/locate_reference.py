import json
import re


class ReferenceLocator:
    def __init__(self, gpt_answer: str, serper_response: dict):
        self.gpt_answer = gpt_answer
        self.serper_response = serper_response

    def locate_source(self):
        """
        Returns a "list of information sources" for all "quoted sentences" in the GPT answer,
        such as web page title, URL, timestamp, original quoted text, etc.
        """
        # Split the answer into content and references parts
        splitted_answer = self.gpt_answer.split("\nReferences:")
        if len(splitted_answer) != 2:
            return -1

        answer_content = splitted_answer[0]  # Content part
        answer_references = splitted_answer[1]  # References part

        # Process the content to find sentences with references
        sentences_with_index = self._handle_sentences_in_answer(answer_content)
        # Match these sentences with their corresponding references
        sentences_with_references = self._match_references(
            answer_references, sentences_with_index
        )
        # Match web information with the found references
        reference_cards = self._match_web_info(sentences_with_references)

        return reference_cards

    def _handle_sentences_in_answer(self, answer_content: str):
        """
        Finds and processes all the sentences in the GPT's answer that contain references.
        """
        content_pattern = r"(?<=[\n\.\!]).*?\[\d+\]"
        matched_sentences = re.findall(content_pattern, answer_content)

        sentences_with_index = []
        for sentence in matched_sentences:
            sent, index = sentence.split(" [")
            index = int(index[:-1])
            sentences_with_index.append({"index": index, "sent": sent})

        return sentences_with_index

    def _match_references(self, answer_references: str, sentences_with_index: list):
        """
        Matches the original sentences with their corresponding reference URLs and quoted sentences.
        """
        # Extract reference indices, URLs, and quoted sentences
        index_pattern = r"\[\d+\]"
        index_list = re.findall(index_pattern, answer_references)

        url_pattern = r"https://[^\n]+"
        url_list = re.findall(url_pattern, answer_references)

        source_pattern = r"Quoted sentence: (.*?)\n"
        source_list = re.findall(source_pattern, answer_references)

        reference_with_index = [
            {
                "index": int(index_list[i][1:-1]),
                "url": url_list[i],
                "source": source_list[i],
            }
            for i in range(len(index_list))
        ]

        sentences_with_references = []
        for dict1 in sentences_with_index:
            for dict2 in reference_with_index:
                if dict1["index"] == dict2["index"]:
                    dict1.update({"url": dict2["url"], "source": dict2["source"]})
                    sentences_with_references.append(dict1)

        return sentences_with_references

    def _match_web_info(self, sentences_with_references: list):
        """
        Matches the sentences with references to the corresponding web information.
        """
        # Retrieve the web information (titles, timestamps, snippets) for each reference
        url_index_list = self.serper_response["links"]
        reference_cards = [
            {
                "titles": self.serper_response["titles"][
                    url_index_list.index(reference["url"])
                ],
                # 'time': self.serper_response['time'][url_index_list.index(reference['url'])],
                "snippets": self.serper_response["snippets"][
                    url_index_list.index(reference["url"])
                ],
                **reference,
            }
            for reference in sentences_with_references
        ]

        return reference_cards


# Example usage
if __name__ == "__main__":
    # Below is an answer example to demonstrate the effect
    gpt_answer = r"""
Tencent Games, a leading Chinese game developer and publisher, has been making significant strides in expanding its global market share. While China remains the largest gaming market for Tencent, the company has been actively pursuing international growth and aims to have half of its players overseas [1]. However, as of 2020, only 21% of Tencent's total games revenue came from outside China [1]. 

Tencent's revenue from its gaming business has been on the rise. In the first quarter of 2023, Tencent's operating revenue increased by 11% to CNY48.3 billion (USD6.8 billion) compared to the same period last year [2]. The company's domestic revenue rose by 6.4% to CNY35.1 billion, marking the first growth since the same period in 2022 [2]. Additionally, Tencent's overseas revenue saw a record increase of 25% to CNY13.2 billion [2]. 

In terms of market dominance, Tencent and NetEase, another major Chinese game developer, accounted for more than 80% of the revenue generated by China's top ten gaming companies in the first quarter of 2023 [3]. Tencent alone accounted for roughly 50% of the domestic market revenue for the quarter [3]. NetEase's operating revenue from games also saw a 7.6% year-on-year increase, reaching 20.1 billion yuan [3].

Tencent's success can be attributed to its popular games such as Honor of Kings, Call of Duty Mobile, Moonlight Blade Mobile, Valorant, and Clash of Clans [4]. These games have been driving the company's growth both in the Chinese and international markets [4]. PUBG and Honor of Kings are also among the top-grossing games worldwide [4].

While Tencent continues to focus on mobile gaming, it recognizes the potential for growth in the PC and console market, which is worth over $70 billion outside China [1]. The company is incubating internal teams to develop cross-platform and AAA titles, and it is also looking to invest in game companies that already have expertise in these areas [1].

In conclusion, Tencent Games has been steadily expanding its global market share, with a focus on increasing its player base outside of China. The company's revenue from its gaming business has been growing, and it remains a dominant player in the Chinese gaming market. With popular games and strategic investments, Tencent is well-positioned to continue its global gaming domination [1].

References:
[1] URL: https://nikopartners.com/tencents-silent-pursuit-of-global-gaming-domination/
    Quoted sentence: While China is the largest gaming market in the world with 33% of PC and mobile games revenue derived from mainland China gamers, Tencent wants to be a global giant. The firm stated that its target is to have half of its players overseas, but we note that only 21% of its total games revenue in 2020 was from outside China.
    
[2] URL: https://www.yicaiglobal.com/news/20230605-01-tencent-netease-make-80-of-chinas-top-10-game-developers-operating-revenue-in-first-quarter
    Quoted sentence: Tencent accounted for about half of domestic market revenue in the quarter, up from 40 percent a year earlier. The market share of small and mid-sized game firms contracted further.
    
[3] URL: https://www.pocketgamer.biz/news/81670/tencent-and-netease-dominated-among-chinas-top-developers-in-q1/
    Quoted sentence: Tencent accounted for roughly 50% of domestic market revenue for the quarter, compared to 40% in Q1 2022. The company’s operating revenue rose 11% to 48.3 billion yuan ($6.8 billion), while domestic revenue rose 6.4% to 35.1 billion yuan ($4.93 billion). Overseas revenue rose by a record 25%, hitting 13.2 billion yuan ($1.86 billion).
    
[4] URL: https://webtribunal.net/blog/tencent-stats/
    Quoted sentence: Honor of Kings, Call of Duty Mobile, Moonlight Blade Mobile, Valorant, and Clash of Clans, are the main games driving the segment’s growth, both in the Chinese and the international market.
    """

    serper_response = {
        "query": "Tencent Game's Global Market Share",
        "language": "en-us",
        "count": 10,
        "titles": [
            "China's Tencent revenue growth below expectations; gaming falls short - Reuters",
            "Tencent, NetEase Made 80% of Revenue at China's Top 10 Listed Game Developers in First Quarter - Yicai Global",
            "China's Tencent marks return to revenue growth in first quarter | Reuters",
            "21 Terrific Tencent Statistics to Think Over in 2023 - WebTribunal",
            "Global Video Games Market Report 2023, Featuring Profiles of Key Players Including Apple, Microsoft, Tencent Holdings , Sony, Nintendo and Electronic Art - Yahoo Finance",
            "China Online Gaming Market Report 2023 to 2027: Featuring NetEase, Tencent, 37 Interactive Entertainment and Net Dragon Among Others - PR Newswire",
            "Tencent and NetEase generated over 80% of revenue among the country's top game makers - Pocket Gamer.biz",
            "Breaking Down the Global Gaming Market in 2022 - ABI Research",
            "The Top 10 Public Game Companies Generated $126 Billion in 2021 as Subscriptions and M&A Shake up the Market | Newzoo",
            "Tencent's Silent Pursuit of Global Gaming Domination - Niko Partners",
        ],
        "links": [
            "https://www.reuters.com/technology/chinas-tencent-posts-weak-revenue-growth-2023-08-16/",
            "https://www.yicaiglobal.com/news/20230605-01-tencent-netease-make-80-of-chinas-top-10-game-developers-operating-revenue-in-first-quarter",
            "https://www.reuters.com/technology/chinas-tencent-enjoys-return-revenue-growth-first-quarter-2023-05-17/",
            "https://webtribunal.net/blog/tencent-stats/",
            "https://finance.yahoo.com/news/global-video-games-market-report-085300042.html",
            "https://www.prnewswire.com/news-releases/china-online-gaming-market-report-2023-to-2027-featuring-netease-tencent-37-interactive-entertainment-and-net-dragon-among-others-301735946.html",
            "https://www.pocketgamer.biz/news/81670/tencent-and-netease-dominated-among-chinas-top-developers-in-q1/",
            "https://www.abiresearch.com/blogs/2022/08/04/gaming-market-in-2022-and-beyond/",
            "https://newzoo.com/resources/blog/the-top-10-public-game-companies-generated-126-billion-in-2021-as-subscriptions-and-ma-shake-up-the-market",
            "https://nikopartners.com/tencents-silent-pursuit-of-global-gaming-domination/",
        ],
        "snippets": [
            "Domestic gaming revenue was little changed at 31.8 billion yuan, while international gaming revenue rose 12% to 12.7 billion yuan, excluding ...",
            "Tencent accounted for about half of domestic market revenue in the quarter, up from 40 percent a year earlier. The market share of small and mid ...",
            "The world's largest video game company and operator of the WeChat messaging platform on Wednesday posted an 11% rise in revenue, beating analyst ...",
            "In 2018, 15% of the world's total gaming revenue came from Tencent. (Source ... Tencent's Market Share. Tencent is a global information and technology firm ...",
            "The larger share of the market was being held by Asia Pacific. Factors such as cloud gaming, shift to new models of monetization and 5G internet ...",
            "China is the 'Gaming Industry Capital of the World' making up around 25 percent of the global video game industry. However, China's biggest tech ...",
            "Tencent accounted for roughly 50% of domestic market revenue for the quarter, compared to 40% in Q1 2022. The company's operating revenue rose ...",
            "Tencent Dominates the Gaming Market ... With US$27 billion in 2021 revenue, Chinese game developer Tencent captures 13.2% of the global gaming ...",
            "Tencent Remains the #1 Games Company by Revenues by a Huge Margin · At home in China, mobile MOBA Honor of Kings—one of the world's biggest games ...",
            "Tencent is the world's largest games company and continuing to grow organically as well as through investments and acquisitions.",
        ],
        "time": [
            "",
            "",
            "",
            "",
            "2023-07-24T08:53:00.000Z",
            "",
            "2023-06-05T14:50:00+0100",
            "",
            "",
            "",
        ],
    }

    locator = ReferenceLocator(gpt_answer, serper_response)
    reference_cards = locator.locate_source()
    json_formatted_cards = json.dumps(reference_cards, indent=4)
    print(json_formatted_cards)
