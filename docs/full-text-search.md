# Full-Text Search

LokiJS provides a fast and powerful open-source full-text search engine.

The engine can be used with the LokiJS database to perform full-text
searches over a collection. In addition, the combination enables an easy
document and persistence management since this is already handled by the
database itself.

But the full-text search can also be used as a standalone engine, to fit
all your needs.

## Technical concept

The technical concept is very similar to [Apache Lucene][Lucene] and
[Elasticsearch].

This full-text search is able to achieve fast search responses because,
instead of searching the text directly, it searches an index instead.
This would be the equivalent of retrieving pages in a book related to a
keyword by searching the index at the back of a book, as opposed to
searching the words in each page of the book.

For example, the given text:

> Betty Botter bought some butter<br/>

will be tokenized into these words:

> betty, botter, bought, butter

and then used as an 1-gram inverted index tree:

![inverted-index][inverted-index]

Now the inverted index can be searched in different ways:

 * the term query *"betty"* finds `betty`
 * the wildcard query *"b?tter"* finds `botter, butter`
 * the fuzzy query *"boght"* finds `bought`
 * the term query *"some"* finds nothing
 * and so on...

In addition to it, this full-text search ranks the matching documents
according to their relevance to a given search query using the ranking
function [Okapi BM25][BM25].

For example, these five documents:

1. Betty Botter bought some butter
2. But she said the butter’s bitter
3. If I put it in my batter, it will make my batter bitter
4. But a bit of better butter will make my batter better
5. So ‘twas better Betty Botter bought a bit of better butter

* For the term query *"butter"* document 1 has the highest score, because it has the fewest words.
* For the term query *"batter"* document 3 has the highest score, because this document contains "*batter*" twice.
* For the term query *"better"* document 4 and 5 has the highest score, because there word count is the same and containing "*better*" twice.

[Lucene]: https://lucene.apache.org/core/
[Elasticsearch]: https://www.elastic.co/de/products/elasticsearch
[inverted-index]: https://www.planttext.com/plantuml/img/LP313e8m44JlynLDJzg4Iq6u6Ny5P0KIf4cP7lnxPH5ZJvDzCvb9zhQoZKpF6RCyQ1XCd8QHff-Yt3c51ITtDaLnDRQpfbrDXqvFWQWIt6sgJG_w7JZtSixYcmy8MQu4omnKOBK3KI0UyckAshGt92JL0OFgYF68yHFJiiinQvE2v95yDbU3TGOQiCdsIqZvlx_1w07SPEctZxq1
[BM25]: https://en.wikipedia.org/wiki/Okapi_BM25

### Demo application

<style>
  #fts-documents
  {
      display: flex;
  }
  #fts-documents .fts-document
  {
      margin-left:5px;
      margin-right:5px;
      text-align:center;
  }
  #fts-documents .fts-document textarea
  {
    overflow:hidden;
    resize:none;
  }
</style>

<div style="border-top: 1px solid #eee;border-bottom:1px solid #eee;background:#fafafa;margin-bottom:20px;padding:20px 10px;text-align:center">
<div id="fts-documents">
    <div class="fts-document"><h7>Document 1</h7>
        <textarea docId="1">Betty Botter bought some butter</textarea>
    </div>
    <div class="fts-document"><h7>Document 2</h7>
        <textarea docId="2">But she said the butter’s bitter</textarea>
    </div>
    <div class="fts-document"><h7>Document 3</h7>
        <textarea docId="3">If I put it in my batter, it will make my batter bitter</textarea>
    </div>
    <div class="fts-document"><h7>Document 4</h7>
        <textarea docId="4">But a bit of better butter will make my batter better</textarea>
    </div>
    <div class="fts-document"><h7>Document 5</h7>
        <textarea docId="5">So ‘twas better Betty Botter bought a bit of better butter</textarea>
    </div>
</div>
<form style="line-height:150%">
<b>Query type:</b><br>
<input type="radio" name="queryType" value="match">Match
<input type="radio" name="queryType" value="term">Term
<input type="radio" name="queryType" value="wildcard">Wildcard
<input type="radio" name="queryType" value="fuzzy">Fuzzy
<input type="radio" name="queryType" value="prefix">Prefix
</form>
<input id="fts-demo" autofocus type="text" name="q" placeholder="Type..." style="width:100%;max-width:80%;outline:0">

<script>
$(document).ready(() => {
  LokiFullTextSearch.register();

  // Create database.
  const loki = new Loki();
  const tk = new LokiFullTextSearch.Tokenizer();
  tk.setSplitter("whitespace", (str) => {
    let tokens = str.split(/[^\S]+/);
    for (let i = 0; i < tokens.length; i++) {
      tokens[i] = tokens[i].toLowerCase();
    }
    return tokens;
  });

  // Fill collection with empty data.
  const coll = loki.addCollection("test", {fullTextSearch: [{field: "txt", tokenizer: tk }]});
  for (let i = 0; i < 5; i++) {
    coll.insert({txt: ""});
  }

  // Read document content.
  $(".fts-document").on('change keyup', 'textarea', function () {
    // Align the size of the text areas.
    let max_height = 0;
    $(".fts-document textarea").each(function (textarea) {
      $(this)[0].style.height = 0;
      max_height = Math.max(max_height, $(this)[0].scrollHeight)
    });
    $(".fts-document textarea").each(function (textarea) {
      $(this).height(max_height);
    });

    // Get content of textarea and update associated loki document.
    const docId = Number($(this).attr("docId"));
    const doc = coll.find({"$loki": docId})[0];
    doc.txt = $(this).val();
    coll.update(doc);
  }).find('textarea').change();

  $("input:radio[name=queryType]").change(function() {
    switch ($(this).val()) {
      case "match":
      case "term":
      case "wildcard":
      case "fuzzy":
      case "prefix":
    }
    console.log("aha");
  });
  $("input[name=queryType][value='match']").prop("checked", true).change();

  new autoComplete({
      selector: '#fts-demo',
      minChars: 1,
      cache: false,
      source: (term, suggest) => {
        term = term.toLowerCase();
        const query = {query: {type: "fuzzy", field: "txt", value: term, fuzziness: 2, prefix_length: 0}};
        const rs = coll.chain().find({$fts: query}).sortByScoring();
        const result = rs.data();
        const scoring = rs.getScoring();
        const suggestions = [];
        for (let i = 0; i < result.length; i++) {
          suggestions.push({txt: result[i].txt, score: scoring[i].score, docId: result[i].$loki});
        }
        suggest(suggestions);
      },
      renderItem: (item, search) => {
        search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        var re = new RegExp("(" + search.split(' ').join('|') + ")", "gi");
        console.log(search, re)
        return '<div class="autocomplete-suggestion">'
          + item.docId + ") "
          + item.txt.replace(re, "<b>$1</b>")
          + '<strong style="float:right;">[' + item.score.toFixed(2) + ']</strong></div>';
      },
  });
});
</script>
</div>
</div>

## Quick start

#### Naming

Use `import {FullTextSearch} from "@lokijs/full-text-search`

### Standalone

```javascript
// Runnable code
const fts = new LokiFullTextSearch([{field: "txt"}], "id");

fts.addDocument({id: 1, txt: "Betty Botter some butter"});
fts.addDocument({id: 2, txt: "But she said the butter’s bitter"});
fts.addDocument({id: 3, txt: "If I put it in my batter, it will make my batter bitter"});
fts.addDocument({id: 4, txt: "But a bit of better butter will make my batter better"});
fts.addDocument({id: 5, txt: "So ‘twas better Betty Botter bought a bit of better butter"});

const query = {query: {type: "term", field: "txt", value: "butter"}}
const result = fts.search(query);

cout(result);
```


### Within LokiJS database

```javascript
// Runnable code
// Call before use!
LokiFullTextSearch.register();

const loki = new Loki();

const coll = loki.addCollection("test", {fullTextSearch: [{field: "txt"}]});
coll.insert([
  {txt: "Betty Botter some butter"},
  {txt: "But she said the butter’s bitter"},
  {txt: "If I put it in my batter, it will make my batter bitter"},
  {txt: "But a bit of better butter will make my batter better"},
  {txt: "So ‘twas better Betty Botter bought a bit of better butter"}
]);

const query = {query: {type: "term", field: "txt", value: "butter"}}
const result = coll.find({$fts: query});
cout(result);

```
