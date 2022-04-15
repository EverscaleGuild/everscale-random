import {Address, Contract, ProviderRpcClient} from 'everscale-inpage-provider'
import {BigNumber} from 'bignumber.js'
import ftTokenRootABI from 'broxus-ton-tokens-contracts/build/TokenRoot.abi.json'
import ftTokenWalletABI from 'broxus-ton-tokens-contracts/build/TokenWallet.abi.json'

const ever = new ProviderRpcClient()
// const ever = new ProviderRpcClient({
//     // fallback: () => EverscaleStandaloneClient.create({
//     //     connection: 'mainnet',
//     // }),
// })
class FT {
    meta: TokenMeta
    contract: Contract<ftTokenRootABI>

    constructor(meta: TokenMeta, contract: Contract<ftTokenRootABI>) {
        this.meta = meta
        this.contract = contract
    }

    static async build(token: string) {
        if (token[1] === ':') {
            return this.buildByAddress(token)
        }
        return this.buildBySymbol(token)
    }

    static async buildByAddress(address: string) {
        const contract = FT.rootConnect(new Address(address))
        const decimals = parseInt((await contract.methods.decimals({
            answerId: 0,
        }).call()).value0)
        const symbol = (await contract.methods.symbol({
            answerId: 0,
        }).call()).value0
        return new FT({
            decimals,
            symbol,
        }, contract)
    }

    static async buildBySymbol(symbol: string) {
        const meta = await tokenMeta(symbol)
        if (!meta.address && !meta.decimals) {
            throw new Error(`Not exist symbol: ${symbol}`)
        }
        return new FT(meta, FT.rootConnect(new Address(meta.address)))
    }

    async walletOf(owner: string) {
        const walletAddress = (await this.contract.methods.walletOf({
            walletOwner: new Address(owner),
            answerId: 0,
        }).call()).value0
        return FT.walletConnect(walletAddress)
    }

    async balanceOf(owner: string): Promise<BigNumber> {
        try {
            const wallet = await this.walletOf(owner)
            return (new BigNumber((await wallet.methods.balance({
                answerId: 0,
            }).call()).value0)).div(new BigNumber(10).pow(this.meta.decimals))
        } catch (error) {
            console.info(error)
            return new BigNumber(0)
        }
    }

    static rootConnect(address: Address): Contract<ftTokenRootABI> {
        return new ever.Contract(
            ftTokenRootABI,
            address
        )
    }

    static walletConnect(address: Address): Contract<ftTokenWalletABI> {
        return new ever.Contract(
            ftTokenWalletABI,
            address
        )
    }
}

async function tokenMeta(symbol: string): Promise<TokenMeta> {
    const list = await fetchTokenList('https://raw.githubusercontent.com/broxus/ton-assets/master/manifest.json')
    for (let item of list) {
        if (item.symbol === symbol) {
            return item
        }
    }
    throw new Error(`Not exist ${symbol}`)
}

interface TokenMeta {
    name?: string
    chainId?: number
    symbol?: string
    decimals?: number
    address?: string
    logoURI?: string
    version?: number
    verified?: boolean
    vendor?: string
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
    return (await fetchJSON(url)).tokens as TokenMeta[]
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
        'extension',
        'main',
    ].forEach(screen => {
        const switcher = elem => elem.style.display = (to === screen ? 'block' : 'none')
        behavior(screen, switcher)
    })
}

interface FilterData {
    rootAddress?: string
    symbol?: string
    balance: number
}

interface Data {
    filter: FilterData,
    list: string[]
}

interface ItemData {
    address: string,
    balance: number
}

async function random(data: Data) {
    const ft = await FT.build(data.filter.symbol || data.filter.rootAddress)
    const list = data.list
    const balanceList: ItemData[] = []
    behavior('out', innerText(`Check balance ${ft.meta.symbol} of ${list.length} accounts`))
    let out = ''
    for (let address of list) {
        const balance = await ft.balanceOf(address)
        balanceList.push({
            address,
            balance: balance.toNumber(),
        })
        out = `${address}\t${balance.toFixed(2)}\n` + out
        behavior('log', innerText(out))
    }
    const filterByBalance = (item) => item.balance >= data.filter.balance
    const filtered = balanceList.filter(filterByBalance)
    let message = `Checked ${list.length} accounts.
Filtered ${filtered.length} address with balance ${ft.meta.symbol} greater than and equal ${data.filter.balance}.`
    if (filtered.length > 0) {
        const random = filtered[randomIntFromInterval(0, filtered.length - 1)]
        message += `
And random selected:
🎉 ${random.address} 🎉`
    }
    // https://gist.githubusercontent.com/ilyar/b89ea1d236bd7a58fe194c28890d4c36/raw/3fb6c45375980080ec441ebc114d61aed75c32bb/sample_data_02.json
    behavior('out', innerText(message))
}

async function mainFlow() {
    const state = await ever.getProviderState()
    behavior('network', innerText(`Selected connection: ${state.selectedConnection}`))
    switchScreen('main')
    behavior('data', elem => {
        elem.addEventListener('change', async () => {
            const data = await fetchJSON(elem.value) as Data
            console.log(data)
            await random(data)
        })
    })
}

async function App() {
    if ((await ever.hasProvider())) {
        try {
            await ever.ensureInitialized()
            await ever.requestPermissions({
                permissions: ['basic'],
            })
            await mainFlow()
        } catch (error) {
            throw error // TODO handle it
        }
    } else {
        switchScreen('extension')
    }
}

App().catch(error => {
    console.error('App:', error)
})
