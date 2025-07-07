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
  const [mint, bump] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from('sc-token-mint')], program.programId)

  console.log('geri - mint, bump', mint.toBase58(), bump)

  const [token, tokenBump] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from('sc-token')], program.programId)

  console.log('geri - token, tokenBump', token.toBase58(), tokenBump)

  console.log('geri - payer', payer.publicKey.toBase58())

  const counterKeypair = Keypair.generate()

  it('Initialize Counter', async () => {
    const amount = new anchor.BN(1_000_000 * 10 ** 6)
    await program.methods
      .initialize(amount)
      .accounts({
        counter: counterKeypair.publicKey,
        payer: payer.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([counterKeypair])
      .rpc()

    const currentCount = await program.account.counter.fetch(counterKeypair.publicKey)

    expect(currentCount.count).toEqual(0)

    // Check created mint

    try {
      const mintAccount = await getMint(program.provider.connection, mint, 'confirmed', TOKEN_2022_PROGRAM_ID)

      console.log('Mint Account', mintAccount.address.toBase58())
    } catch (e) {
      console.log('Error: ', e)
    }

    // Check created token account
    try {
      const tokenAccount = await getAccount(program.provider.connection, token, 'confirmed', TOKEN_2022_PROGRAM_ID)

      console.log('Token Account', tokenAccount.address.toBase58())
    } catch (e) {
      console.log('Error: ', e)
    }

    // try {
    //   const associatedTokenAccount = await getAssociatedTokenAddress(
    //     mint,
    //     provider.publicKey,
    //     false,
    //     TOKEN_2022_PROGRAM_ID,
    //   )

    //   console.log('geri - associatedTokenAccount', associatedTokenAccount)

    //   const tokenAccount = await getAccount(
    //     program.provider.connection,
    //     associatedTokenAccount,
    //     'confirmed',
    //     TOKEN_2022_PROGRAM_ID,
    //   )

    //   console.log('Token Account', tokenAccount)
    // } catch (e) {
    //   console.log('Error: ', e)
    // }
  })

  ///////////////////////////////////////////////////////////////
  // BEGIN: SPL tests
  ///////////////////////////////////////////////////////////////
  it('Transfer Tokens', async () => {
    const amount = new anchor.BN(100_000 * 10 ** 6)

    const tx = await program.methods
      .transferTokens(amount)
      .accounts({
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc({ commitment: 'confirmed' })

    console.log('Your transaction signature', tx)

    expect(program.provider.publicKey).toBeDefined()

    const associatedTokenAccount = await getAssociatedTokenAddress(
      mint,
      program.provider.publicKey as PublicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
    )

    const recipientTokenAccount = await getAccount(
      program.provider.connection,
      associatedTokenAccount,
      'confirmed',
      TOKEN_2022_PROGRAM_ID,
    )

    const senderTokenAccount = await getAccount(program.provider.connection, token, 'confirmed', TOKEN_2022_PROGRAM_ID)

    console.log('Mint                     ', mint)
    console.log('From                     ', token)
    console.log('From token address       ', senderTokenAccount.address)
    console.log('From token address       ', senderTokenAccount.owner)
    console.log('From token address       ', senderTokenAccount)
    console.log('To                       ', program.provider.publicKey)
    console.log('To token address         ', recipientTokenAccount.address)
    console.log('To token address         ', recipientTokenAccount.owner)
  })

  it.skip('Transfer Tokens - 2', async () => {
    try {
      //   console.log(' transfer test 2')
      //   const recipient = Keypair.generate()
      //   console.log(' transfer test 2 - recipient', recipient)
      // const fromTokenAccount = await getOrCreateAssociatedTokenAccount(provider.connection, payer.payer, mint, fromWallet.publicKey)

      //   const RecipientTokenAccount = await createAssociatedTokenAccount(
      //     provider.connection,
      //     payer.payer,
      //     mint,
      //     recipient.publicKey,
      //     undefined,
      //     TOKEN_2022_PROGRAM_ID,
      //   )

      //   console.log(' transfer test 2 - tokenAccount', tokenAccount)
      //   const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      //     provider.connection,
      //     payer.payer,
      //     mint,
      //     recipient.publicKey,
      //     false,
      //     'confirmed',
      //     undefined,
      //     TOKEN_2022_PROGRAM_ID,
      //   )

      //   console.log(' transfer test 2 - recipientTokenAccount', recipientTokenAccount)

      //   // const tokenAccount = await getAccount(program.provider.connection, token, 'confirmed', TOKEN_2022_PROGRAM_ID)

      //   // // const amount = new anchor.BN(100_000 * 10 ** 6)

      //   console.log('sending tokens payer: ', payer)
      //   console.log('sending tokens from: ', senderTokenAccount.address)
      //   console.log('sending tokens to: ', recipientTokenAccount.address)
      //   console.log('sending tokens to: ', payer.payer.publicKey)
      //   await transfer(provider.connection, payer.payer, fromTokenAccount.address, toTokenAccount.address, fromWallet, 1)

      //   const trx = await transfer(
      //     provider.connection,
      //     payer.payer,
      //     senderTokenAccount.address,
      //     recipientTokenAccount.address,
      //     payer.payer,
      //     100_000,
      //   )
      console.log('trx: ')
    } catch (e) {
      console.log('error: ', e)
    }
  })

  it('Transfer Tokens - 3', async () => {
    console.log('transfer 3 - 1')
    // Connect to cluster
    const connection = program.provider.connection

    console.log('transfer 3 - 2')
    // Generate a new wallet keypair and airdrop SOL
    const fromWallet = provider.wallet.payer

    if (!fromWallet) {
      fail('BAD WALLET!')
      return
    }

    console.log('transfer 3 - 3')
    // Generate a new wallet to receive newly minted token
    const toWallet = Keypair.generate()

    console.log('transfer 3 - 4')
    // Create new token mint
    // const mint = await createMint(connection, fromWallet, fromWallet.publicKey, null, 9)

    console.log('transfer 3 - 5')
    // Get the token account of the fromWallet Solana address, if it does not exist, create it
    const fromTokenAccount = await getAssociatedTokenAddress(mint, fromWallet.publicKey, false, TOKEN_2022_PROGRAM_ID)

    console.log('transfer 3 - 6')
    //get the token account of the toWallet Solana address, if it does not exist, create it
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      fromWallet,
      mint,
      toWallet.publicKey,
      false,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    )

    console.log('transfer 3 - 7')
    // Minting 1 new token to the "fromTokenAccount" account we just returned/created
    // await mintTo(
    //   connection,
    //   fromWallet,
    //   mint,
    //   fromTokenAccount.address,
    //   fromWallet.publicKey,
    //   1000000000, // it's 1 token, but in lamports
    //   [],
    // )

    console.log('transfer 3 - 8')
    // // Add token transfer instructions to transaction
    // const transaction = new Transaction().add(
    //   createTransferInstruction(fromTokenAccount.address, toTokenAccount.address, fromWallet.publicKey, 1),
    // )

    // console.log('transfer 3 - 9')
    // // Sign transaction, broadcast, and confirm
    // await sendAndConfirmTransaction(connection, transaction, [fromWallet])

    // Sign transaction, broadcast, and confirm
    await transfer(
      connection,
      payer.payer,
      fromTokenAccount,
      toTokenAccount.address,
      fromWallet,
      100_000,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    )
    console.log('transfer 3 - 10')

    const toTokenAccountFinal = await getAccount(connection, toTokenAccount.address, 'confirmed', TOKEN_2022_PROGRAM_ID)

    // const fromAccount = await getAccount(connection, fromWallet.publicKey);
    console.log('fromWallet', fromWallet.publicKey.toBase58())
    console.log('toWallet', toWallet.publicKey.toBase58())
    console.log('fromTokenAccount', fromTokenAccount.toBase58())
    console.log('toTokenAccountFinal', toTokenAccountFinal)
    // console.log('toTokenAccount?', await getAccount(connection, toTokenAccount.address))
  })
  ///////////////////////////////////////////////////////////////
  // END: SPL tests
  ///////////////////////////////////////////////////////////////
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
