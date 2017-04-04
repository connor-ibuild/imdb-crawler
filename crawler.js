var request = require('request');
var cheerio = require('cheerio');

var maxEventsInQueue = 50;
var baseUrl = 'https://www.imdb.com';

var requestHeaders = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_0) AppleWebKit/601.2.7 (KHTML, like Gecko) Version/9.0.1 Safari/601.2.7',
  'Mozilla/5.0 (Windows NT 6.2; WOW64; rv:23.0) Gecko/20100101 Firefox/23.0'
];

var httpRequest = {
  url: baseUrl,
  headers: {
    'User-Agent': requestHeaders[0]
  },

  proxy: 'http://fr.proxymesh.com:31280',
  strictSSL: false
};

var links = [];
var currentTierLinks = [];
var nextTierLinks = [];
var pageCrawlHistory = [];
var pageCrawlQueue = [];

var crawlCount = 0;
var nextUrl = '';
var originUrl = '';
var movieCrawlCount = 0;

var nextLinkIndex = 0;
var eventsInQueue = 0;

var date = new Date();
var startTime = date.getTime();
var tierCrawlCount = 0;

var smallDelayCountdown = Math.floor(Math.random() * 6) + 10;
var bigDelayCountdown = Math.round(Math.random() * 20) + 40;

var timeout = false;
var updateTier = false;


var crawlPage = function(httpRequest) {

  if (movieCrawlCount >= 1000) {
    console.log('1000 movie crawls !!!!!');
    var date = new Date();
    var endTime = date.getTime();
    var timeTaken = endTime - startTime;
    var timeTakenInSecs = timeTaken / 1000;
    console.log('time taken --> ' + timeTaken);
    console.log('time taken in seconds --> ' + timeTakenInSecs);
    process.exit();
  }

  eventsInQueue ++;
    
  request(httpRequest, function(error, response, body) {

    if (error) {
      crawlPageComplete();
      return;
    }

    console.log('crawling page --> ' + httpRequest.url);

    if (response.statusCode == 200) {
      console.log('200');
    } else {
      console.log(response.statusCode);
    }

    var $ = cheerio.load(body);

    /* get a tags */
    $('a').each(function (i, elem) {
      var link = elem.attribs.href;

      if (link === undefined) {
        return true;
      }

      if (link.includes('http') && link.substring(0, link.length) !== baseUrl) {
        return true;
      }

      if (link.includes('@')) {
        return true;
      }

      if (link.substring(link.length - 4, link.length) === '.jpg' ||
        link.substring(link.length - 4, link.length) === '.png')
      {
         return true;
      }

      if (link.substring(link.length - 4, link.length) === '.zip') {
        return true;
      }

      links.push({
        text: $(elem).text(),
        url: elem.attribs.href
      });

      nextTierLinks.push(elem.attribs.href);
    });


    /* GET MOVIE DATA */

    /* movie title */
    var movieTitle = $('.title_wrapper h1').text();
    if (movieTitle) {
      console.log('movie crawl count --> ' + movieCrawlCount);
      console.log('movie title -->');
      console.log(movieTitle);

      movieCrawlCount ++;

      /* rating */
      console.log('rating -->');
      var rating = $('.ratingValue span[itemprop="ratingValue"]').text();
      // console.log(rating);

      /* title sub text*/
      var titleSubText = [];
      $('.title_wrapper .subtext a').each(function (i, elem) {
        titleSubText.push($(elem).text());
      });

      /* release date */
      console.log('release date -->');
      var releaseDate = titleSubText[titleSubText.length - 1];
      // console.log(releaseDate);

      /* categories */
      console.log('categories -->');
      var categories = titleSubText;
      categories.pop();
      console.log(categories);
  }

    crawlCount ++;
    pageCrawlHistory.push(originUrl);
    crawlPageComplete();
    return;
  });
}

var nextCrawlPage = function (httpRequest) {
  if (eventsInQueue >= maxEventsInQueue) {
    return;
  }

  // base crawl page -> url
  if (crawlCount === 0) {
    crawlPage(httpRequest);
    return;
  }

  selectNextCrawlPage(httpRequest, function(selectedUrl) {
    var randomUserAgent = Math.round(Math.random() * 2);
    var selectedUserAgent = requestHeaders[randomUserAgent];

    httpRequest = {
      url: selectedUrl,
      headers: {
        'User-Agent': selectedUserAgent
      },

      proxy: 'http://fr.proxymesh.com:31280',
      strictSSL: false
    }

    if (smallDelayCountdown > 0 && bigDelayCountdown > 0) {
      crawlPage(httpRequest);
      smallDelayCountdown --;
      bigDelayCountdown --;
      nextCrawlPage();
      return;
    }

    var delayTime = 0;

    if (bigDelayCountdown <= 0) {
      delayTime = (Math.random() * 1.5) + 1.5;
      bigDelayCountdown = Math.round(Math.random() * 20) + 40;
    } else {
      delayTime = (Math.random() / 10) + 1.0;
      smallDelayCountdown = Math.floor(Math.random() * 6) + 10;
    }

    setTimeout(function() {
      crawlPage(httpRequest);
      nextCrawlPage();
      return;
    }, delayTime);

  });
}


var selectNextCrawlPage = function (error, callback) {
  for (i = nextLinkIndex; i <= currentTierLinks.length; i ++) {
    nextLinkIndex ++;

    if ( pageCrawlHistory.indexOf(currentTierLinks[i]) > -1 ||
      pageCrawlQueue.indexOf(currentTierLinks[i]) > -1 ||
      currentTierLinks[i] === undefined)
    {
      continue;
    }

    nextUrl = currentTierLinks[i];
    originUrl = nextUrl;
    if (nextUrl.includes('http') && nextUrl.substring(0, baseUrl.length) !== baseUrl) {
      continue;
    }

    if (nextUrl.includes('@')) {
      continue;
    }

    if (nextUrl.substring(nextUrl.length - 4, nextUrl.length) === '.jpg' ||
      nextUrl.substring(nextUrl.length - 4, nextUrl.length) === '.png')
    {
      continue;
    }

    if (nextUrl.substring(nextUrl.length - 4, nextUrl.length) === '.zip') {
      continue;
    }

    if (!nextUrl.includes('http')) {
      if (nextUrl.charAt(0) !== '/') {
        nextUrl = baseUrl + '/' + nextUrl;
      } else {
        nextUrl = baseUrl + nextUrl;
      }
    }

    callback(nextUrl);
    break;
  }
}


function crawlPageComplete() {
  eventsInQueue --;
    
  if ( eventsInQueue === 0) {
    if (nextLinkIndex >= currentTierLinks.length ||
      currentTierLinks.length == 0) {
      console.log('update tier');
      UpdateTier();
    }

    nextCrawlPage();
  }
};

function UpdateTier() {
  updateTier = false;
  nextLinkIndex = 0;
  currentTierLinks = nextTierLinks;
  nextTierLinks = [];
  nextCrawlPage()
}

nextCrawlPage(httpRequest);
