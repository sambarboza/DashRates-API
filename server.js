const express = require('express')
const app = express()
const axios = require('axios')
const coinmarketcap = require('coinmarketcap-api')
const cmc = new coinmarketcap()

// set URLs
const bitcoinAverageUrl = 'https://apiv2.bitcoinaverage.com/indices/global/ticker/short?crypto=BTC'
const dashBtcUrl = 'https://apiv2.bitcoinaverage.com/indices/crypto/ticker/DASHBTC'
const poloniexDashUrl = 'https://poloniex.com/public?command=returnTradeHistory&currencyPair=BTC_DASH'
const cryptoCompareUrl = 'https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=VES'

// get bitcoin's average price against various fiat currencies
function getVes(url) {
  let output
  return new Promise(resolve => {
    axios.get(url)
      .then(result => {
        // for each currency passed into this function, we add a key/value to output (ex. USD: 6500.12345)
        output = result.data.VES
        // resolve an object containing all requested currencies
        resolve(output)
      })
      .catch(error => {
        console.log(`Error: ${error}`)
        resolve(error)
      })
  })
}

// get bitcoin's average price against various fiat currencies
function getBitcoinAverage(url, [...currencies]) {
  const output = {}
  return new Promise(resolve => {
    axios.get(url)
      .then(async result => {
        // for each currency passed into this function, we add a key/value to output (ex. USD: 6500.12345)
        for (var currency of currencies) {
          // we check if the currency is 'VES', since the rates given on BitcoinAverage are incorrect
          if (currency === 'VES') {
            // instead we get rates from CryptoCompare
            output[currency] = await getVes(cryptoCompareUrl)
          } else {
            // otherwise we use the "last" price from bitcoinaverage to give us the most recent exchange rate
            output[currency] = result.data[`BTC${currency}`].last
          }
        }
        // resolve an object containing all requested currencies
        resolve(output)
      })
      .catch(error => {
        console.log(`Error: ${error}`)
        resolve(error)
      })
  })
}

// get the current DASH trading price from Poloniex
function getPoloniexDash(url) {
  return new Promise(resolve => {
    axios.get(url)
      .then(result => {
        let total = 0
        let amount = 0
        // loop through the results and get the total BTC traded, and the amount of DASH traded
        for (var i = 0; i < result.data.length; i++) {
          total += parseFloat(result.data[i].total)
          amount += parseFloat(result.data[i].amount)
        }
        // get the average price paid for the last 200 trades
        let average = total / amount
        resolve(average)
      })
      .catch(error => {
        console.log(`Error: ${error}`)
        resolve(false)
      })
  })
}

// get the current BTC/DASH price - we grab the "last" price from bitcoinaverage to get the most recent exchange rate
function getDashBtc(url) {
  return new Promise(resolve => {
    axios.get(url)
      .then(result => {
        resolve(result.data.last)
      })
      .catch(error => {
        console.log(`Error: ${error}`)
        resolve(error)
      })
  })
}

// prettify json
app.set('json spaces', 2)

// ignore favicon
app.use(function(req, res, next) {
  if (req.originalUrl === '/favicon.ico') {
    res.status(204).json({
      nope: true
    })
  } else {
    next()
  }
})

// access control allow headers
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  next()
})

app.use('/static', express.static(__dirname + '/public'))

// docs at '/'
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/public/docs/index.html')
})

// get coinmarketcap rates
app.get('/cmc/:token', function(req, res) {
  const token = req.params.token
  const output = {}
  console.log(`get ${token} exchange rate`)

  cmc.getTicker({
    currency: token
  }).then(function(object) {
    output.USD = object[0].price_usd
    output.BTC = object[0].price_btc
    res.json(output)
  }).catch(console.error)
})

// get Poloniex trading price
app.get('/poloniex', async function(req, res) {
  let price = await getPoloniexDash(poloniexDashUrl)
  res.json(price)
})

// get BitcoinAverage trading price
app.get('/btcaverage', async function(req, res) {
  let price = await getDashBtc(dashBtcUrl)
  res.json(price)
})

// get rates
app.get('/*', async function(req, res) {
  const params = req.params[0].split('/')
  let currencies = params.map(currency => currency.toUpperCase())
  // if we want all rates, we simply pass the 'list' parameter
  if (currencies[0] === "LIST") {
    currencies = ["AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN", "BAM", "BBD", "BDT", "BGN",
      "BHD", "BIF", "BMD", "BND", "BOB", "BRL", "BSD", "BTN", "BWP", "BYN", "BZD", "CAD", "CDF", "CHF", "CLF", "CLP",
      "CNH", "CNY", "COP", "CRC", "CUC", "CUP", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", "EGP", "ERN", "ETB", "EUR",
      "FJD", "FKP", "GBP", "GEL", "GGP", "GHS", "GIP", "GMD", "GNF", "GTQ", "GYD", "HKD", "HNL", "HRK", "HTG", "HUF",
      "IDR", "ILS", "IMP", "INR", "IQD", "IRR", "ISK", "JEP", "JMD", "JOD", "JPY", "KES", "KGS", "KHR", "KMF", "KPW",
      "KRW", "KWD", "KYD", "KZT", "LAK", "LBP", "LKR", "LRD", "LSL", "LYD", "MAD", "MDL", "MGA", "MKD", "MMK", "MNT",
      "MOP", "MRO", "MUR", "MVR", "MWK", "MXN", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK", "NPR", "NZD", "OMR", "PAB",
      "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "RON", "RSD", "RUB", "RWF", "SAR", "SBD", "SCR", "SDG", "SEK",
      "SGD", "SHP", "SLL", "SOS", "SRD", "SSP", "STD", "SVC", "SYP", "SZL", "THB", "TJS", "TMT", "TND", "TOP", "TRY",
      "TTD", "TWD", "TZS", "UAH", "UGX", "USD", "UYU", "UZS", "VES", "VND", "VUV", "WST", "XAF", "XAG", "XAU", "XCD",
      "XDR", "XOF", "XPD", "XPF", "XPT", "YER", "ZAR", "ZMW", "ZWL"
    ]
  }
  console.log(`get rate: ${currencies}`)
  try {
    // get current average BTC/FIAT and BTC/DASH exchange rate
    const rates = await getBitcoinAverage(bitcoinAverageUrl, currencies)
    const poloniex = await getPoloniexDash(poloniexDashUrl)
    const dash = await getDashBtc(dashBtcUrl)
    // 'rates' is an object containing requested fiat rates (ex. USD: 6500)
    // multiply each value in the object by the current BTC/DASH rate
    for (var key in rates) {
      if (rates.hasOwnProperty(key)) {
        rates[key] *= poloniex || dash
      }
    }
    // return the rates object
    res.json(rates)
  } catch (e) {
    // this will eventually be handled by error handling middleware
    res.send(`error: ${e}`)
    console.log(e)
  }
})

// set server
const server = app.listen(8081, function() {
  const port = server.address().port;
  console.log(`DashRates API v0.1.2 running on port ${port}`)
})
