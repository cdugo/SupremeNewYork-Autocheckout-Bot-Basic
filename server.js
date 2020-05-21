const gotPackage = require('got').default,
  { promisify } = require('util'),
  { CookieJar } = require('tough-cookie');


function proxy(org, proxifier) {
  return new Proxy(proxifier(org), {
    get: (obj, prop) => (prop in obj ? obj[prop] : org[prop])
  });
}

let cookieJar = new CookieJar();

const cookies = proxy(cookieJar, obj => {
  return {
    setCookie: async (rawCookie, url) => obj.setCookie(rawCookie, url, () => {}),
    getCookieString: async (url) => obj.getCookieString(url),
  };
});

const got = gotPackage.extend({
      cookieJar: cookies,
      prefixUrl: 'https://www.supremenewyork.com/',
      retry: 0,
      headers: {
        'accept-language': 'en-ca',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36',
        'x-requested-with': 'XMLHttpRequest',
        'referer': 'https://www.supremenewyork.com/mobile',
        'accept-encoding': 'gzip, deflate, br',
      },
});


const isKeywordsAMatch = (keywords, targetString) => { // passes in keyword and target string params
    return !keywords.negative.some((negativeKeyword) => targetString.includes(negativeKeyword)) && //if even one of the keywords matches with a negative keyword, 
      keywords.positive.every((positiveKeyword) => targetString.includes(positiveKeyword));
}

const getProductInformation = async (product) => {
  const productInformationResponse = await got.get(`shop/${product.id}.json`, { responseType: 'json' }); //gets product info

  return productInformationResponse.body;
}

const findStyle = async (product, keywords) => {
  const productInformation = await getProductInformation(product), //gets product info of product
    styles = productInformation.styles, //gets styles json from the product info
    style = styles.find((styleObject) => isKeywordsAMatch(keywords, styleObject.name)); // frp, styles object, its finding your keyword for style in the name

  return style;
}

const findSize = async (sizes, keywords) => {
  const size = sizes.find((sizeObj) => isKeywordsAMatch(keywords, sizeObj.name)); //
  
  return size;
}

const getMobileStock = async () => {
  const mobileStockResponse = await got.get('mobile_stock.json', { responseType: 'json' });

  return mobileStockResponse.body.products_and_categories;
};

const findProduct = async (category, keywords) => {
  const mobileStockCategories = await getMobileStock(), //gets movile stock
    products = mobileStockCategories[category], //gets procuct list of specified category
    product = products.find((productObject) => isKeywordsAMatch(keywords, productObject.name)); //in product list of specified category, find product that matches specified kws

    return product;
}

const ATC = async (product, style, size) => await got.post(`/shop/${product.id}/add.json`, { form: { s: size.id, st: style.id, qty: 1 } });

const checkout = async (billing, shipping) => {
  const { cookies } = cookieJar.toJSON(),
    pureCart = cookies.find((cookie) => cookie.key === 'pure_cart').value;

  const checkoutResponse = await got.post(`checkout.json`, { 
    form: { 
      'store_credit_id': '',
      'from_mobile': '1',
      'cookie-sub': pureCart,
      'current_time': Date.now() + '',
      'same_as_billing_address': '1',
      'scerkhaj': 'CKCRSUJHXH',
      'order[billing_name]': '',
      'order[bn]': 'John Doe',
      'order[email]': 'johndoe@mail.com',
      'order[tel]': '647-869-2145',
      'order[billing_address]': '429 Bel Air rd',
      'order[billing_address_2]': '',
      'order[billing_zip]': '90210',
      'order[billing_city]': 'Beverly Hills',
      'order[billing_state]': 'CA',
      'order[billing_country]': 'USA',
      'riearmxa': '4767 7182 4034 1653',
      'credit_card[month]': '02',
      'credit_card[year]': '2026',
      'rand': '', 
      'credit_card[meknk]': '986',
      'order[terms]': '0',
      'order[terms]': '1',
      'g-captcha-response': '',
  }
  });

  console.log(checkoutResponse)
}

const run = async (category, productKeywords, styleKeywords, sizeKeywords) => {
  const product = await findProduct(category, productKeywords),
    style = await findStyle(product, styleKeywords),
    size = await findSize(style.sizes, sizeKeywords);
   
  await ATC(product, style, size);
  await checkout()
}


const category = 'Accessories',
  productKeywords = {positive: ['Boxer'], negative: []},
  styleKeywords = {positive: ['Black'], negative: []},
  sizeKeywords = {positive: ['Large'], negative: []};

run(category, productKeywords, styleKeywords, sizeKeywords, 1);