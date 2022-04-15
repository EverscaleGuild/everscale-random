import {Address, ProviderRpcClient} from 'everscale-inpage-provider'
import {EverscaleStandaloneClient} from 'everscale-standalone-client'
import {BigNumber} from "bignumber.js"
import ftTokenRootABI from "broxus-ton-tokens-contracts/build/TokenRoot.abi.json"
import ftTokenWalletABI from "broxus-ton-tokens-contracts/build/TokenWallet.abi.json"

const ever = new ProviderRpcClient({
    fallback: () => EverscaleStandaloneClient.create({
        connection: 'mainnet',
    }),
})

async function tokenBalance(symbol: string, owner: string) {
    try {
        const ftTokenMeta = await tokenMeta(symbol)
        const ftToken = new ever.Contract(ftTokenRootABI, ftTokenMeta.rootV5)
        const decimals = parseInt((await ftToken.methods.decimals({
            answerId: 0,
        }).call()).value0)
        const walletAddress = (await ftToken.methods.walletOf({
            walletOwner: new Address(owner),
            answerId: 0,
        }).call()).value0
        const ftWalletToken = new ever.Contract(ftTokenWalletABI, walletAddress)
        const balance = (new BigNumber((await ftWalletToken.methods.balance({
            answerId: 0,
        }).call()).value0)).div(new BigNumber(10).pow(decimals))
        return balance.toNumber()
    } catch (e) {
        return 0
    }
}

async function tokenMeta(symbol: string) {
    const list = await fetchTokenList('https://raw.githubusercontent.com/broxus/everscale-assets-upgrade/master/main.json')
    for (let item of list) {
        if (item.symbol === symbol) {
            return item
        }
    }
    throw new Error(`Not exist ${symbol}`)
}

interface TokenMeta {
    logoURI: string
    proxy: Address
    rootV4: Address
    rootV5: Address
    symbol: string
}

async function fetchJSON(url: string) {
    return fetch(url)
        .then((response) => {
            return response.json()
        })
        .then((json) => {
            return json
        })
}

async function fetchTokenList(url: string): Promise<TokenMeta[]> {
    const json = await fetchJSON(url)
    return json.tokens.map(item => {
        return {
            symbol: item.symbol,
            logoURI: item.logoURI,
            proxy: new Address(item.proxy),
            rootV4: new Address(item.rootV4),
            rootV5: new Address(item.rootV5),
        }
    })
}

function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function behavior(name: string, fn: (elem: HTMLElement | HTMLButtonElement | HTMLInputElement) => void) {
    document.querySelectorAll(`[data-behavior=${name}]`).forEach(fn)
}

const innerText = (text: string) => (elem: HTMLElement | HTMLButtonElement) => {
    elem.innerText = text
}

function switchScreen(to: string) {
    [
        "extension",
        "main",
    ].forEach(screen => {
        const switcher = elem => elem.style.display = (to === screen ? 'block' : 'none')
        behavior(screen, switcher)
    })
}

interface FilterData {
    symbol: string
    balance: number
}

interface Data {
    filter: FilterData,
    list: string[]
}

async function random(data: Data) {
    const accList = data.list
    const balanceList = []
    behavior('out', innerText(`Check balance ${data.filter.symbol}`))
    let out = ''
    for (let address of accList) {
        const balance = await tokenBalance(data.filter.symbol, address)
        balanceList.push({
            address,
            balance,
        })
        out = `${address} ${data.filter.symbol}:${balance}\n` + out
        behavior('log', innerText(out))
    }
    const filterTarget = (item) => item.balance >= data.filter.balance
    const filtered = balanceList.filter(filterTarget)
    console.log(balanceList.length, filtered.length)
    console.log(filtered)
    const random = filtered[randomIntFromInterval(0, filtered.length)]
    behavior('out', innerText(`Random address with balance ${data.filter.symbol} greater than and equal ${data.filter.balance} is 🎉 ${random.address} 🎉`))
}

async function App() {
    switchScreen("extension")
    await ever.ensureInitialized()
    await ever.requestPermissions({
        permissions: ['basic'],
    })
    switchScreen("main")
    behavior("data", elem => {
        elem.addEventListener('change', async () => {
            const data = await fetchJSON(elem.value) as Data
            console.log(data)
            await random(data)
        })
    })

}

App().catch(console.error)
