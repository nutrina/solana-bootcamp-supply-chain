import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js'
import { Counter } from '../target/types/counter'
import {
  TOKEN_2022_PROGRAM_ID,
  getMint,
  getAssociatedTokenAddress,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  transfer,
  createAssociatedTokenAccount,
  createMint,
  mintTo,
  createTransferInstruction,
} from '@solana/spl-token'
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes'

describe('counter', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const payer = provider.wallet as anchor.Wallet

  const program = anchor.workspace.Counter as Program<Counter>
  const seedString: string = 'hello'

  // const seed1 = Buffer.from("sc-batch");
  const serialNumber = 1
  const seed2 = payer.publicKey.toBuffer()
  const seed3 = new anchor.BN(serialNumber).toBuffer('be', 4)
  const seed4 = Buffer.from(seedString)

  const [counter2, counterBump2] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('counter'), seed2],
    program.programId,
  )

  const [counter3, counterBump3] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('counter'), seed2, seed3],
    program.programId,
  )

  const [counter4, counterBump4] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('counter'), seed2, seed4],
    program.programId,
  )

  console.table([
    {
      id: 'payer',
      address: payer.publicKey.toBase58(),
    },
    {
      id: 'counter2',
      address: counter2.toBase58(),
    },
    {
      id: 'counter3',
      address: counter3.toBase58(),
    },
    {
      id: 'counter4',
      address: counter4.toBase58(),
    },
  ])

  const counterKeypair = Keypair.generate()

  it('Initialize Counter', async () => {
    await program.methods
      .initialize()
      .accounts({
        payer: payer.publicKey,
        counter: counterKeypair.publicKey,
      })
      .signers([counterKeypair])
      .rpc()

    const currentCount = await program.account.counter.fetch(counterKeypair.publicKey)

    expect(currentCount.count).toEqual(0)
  })

  it('Initialize Counter with seed', async () => {
    await program.methods
      .initialize2()
      .accounts({
        payer: payer.publicKey,
      })
      .rpc()

    const currentCount = await program.account.counter.fetch(counter2)

    expect(currentCount.count).toEqual(0)
  })

  it('Initialize Counter with seed and serial', async () => {
    try {
      console.log('initializing with seed and serial ...')
      const tx = await program.methods
        .initialize3(serialNumber)
        .accounts({
          payer: payer.publicKey,
        })
        .rpc()

      console.log('initializing with seed and serial, tx', tx)
      const currentCount = await program.account.counter.fetch(counter3)

      console.log('initializing with seed and serial, currentCount', currentCount)
      expect(currentCount.count).toEqual(0)
    } catch (error) {
      console.log('Error', error)
      fail(error)
    }
  })

  it('Initialize Counter with seed and seed string', async () => {
    try {
      await program.methods
        .initialize4(seedString)
        .accounts({
          payer: payer.publicKey,
        })
        .rpc()

      const currentCount = await program.account.counter.fetch(counter4)

      expect(currentCount.count).toEqual(0)
    } catch (error) {
      console.log('Error', error)
      fail(error)
    }
  })

  it('Increment Counter', async () => {
    await program.methods.increment().accounts({ counter: counterKeypair.publicKey }).rpc()

    const currentCount = await program.account.counter.fetch(counterKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Increment Counter Again', async () => {
    await program.methods.increment().accounts({ counter: counterKeypair.publicKey }).rpc()

    const currentCount = await program.account.counter.fetch(counterKeypair.publicKey)

    expect(currentCount.count).toEqual(2)
  })

  it('Decrement Counter', async () => {
    await program.methods.decrement().accounts({ counter: counterKeypair.publicKey }).rpc()

    const currentCount = await program.account.counter.fetch(counterKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Set counter value', async () => {
    await program.methods.set(42).accounts({ counter: counterKeypair.publicKey }).rpc()

    const currentCount = await program.account.counter.fetch(counterKeypair.publicKey)

    expect(currentCount.count).toEqual(42)
  })

  it('Set close the counter account', async () => {
    await program.methods
      .close()
      .accounts({
        payer: payer.publicKey,
        counter: counterKeypair.publicKey,
      })
      .rpc()

    // The account should no longer exist, returning null.
    const userAccount = await program.account.counter.fetchNullable(counterKeypair.publicKey)
    expect(userAccount).toBeNull()
  })
})
