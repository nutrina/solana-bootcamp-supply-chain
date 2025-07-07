#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked},
};

declare_id!("FqzkXZdwYjurnUKetJCAvaUw5WAqbwzU6gZEwydeEfqS");

#[program]
pub mod counter {
    use super::*;

    pub fn close(_ctx: Context<CloseCounter>) -> Result<()> {
        Ok(())
    }

    pub fn decrement(ctx: Context<Update>) -> Result<()> {
        ctx.accounts.counter.count = ctx.accounts.counter.count.checked_sub(1).unwrap();
        Ok(())
    }

    pub fn increment(ctx: Context<Update>) -> Result<()> {
        ctx.accounts.counter.count = ctx.accounts.counter.count.checked_add(1).unwrap();
        Ok(())
    }

    pub fn initialize(ctx: Context<InitializeCounter>, amount: u64) -> Result<()> {
        msg!("Created Mint Account: {:?}", ctx.accounts.mint.key());
        msg!(
            "Created Token Account: {:?}",
            ctx.accounts.token_account.key()
        );

        // Mint the tokens

        let signer_seeds: &[&[&[u8]]] = &[&[b"sc-token-mint", &[ctx.bumps.mint]]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.mint.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(signer_seeds);
        token_interface::mint_to(cpi_context, amount)?;

        let counter = &mut ctx.accounts.counter;
        counter.mint = ctx.accounts.mint.key(); // Set the owner

        Ok(())
    }

    pub fn transfer_tokens(ctx: Context<TransferTokens>, amount: u64) -> Result<()> {
        let signer_seeds: &[&[&[u8]]] = &[&[b"sc-token", &[ctx.bumps.sender_token_account]]];

        // let amount = ctx.accounts.sender_token_account.amount;
        let decimals = ctx.accounts.mint.decimals;

        let cpi_accounts = TransferChecked {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.sender_token_account.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.sender_token_account.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(signer_seeds);
        token_interface::transfer_checked(cpi_context, amount, decimals)?;
        Ok(())
    }

    pub fn set(ctx: Context<Update>, value: u8) -> Result<()> {
        ctx.accounts.counter.count = value.clone();
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeCounter<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        space = 8 + Counter::INIT_SPACE,
        payer = payer
    )]
    pub counter: Account<'info, Counter>,
    pub system_program: Program<'info, System>,

    // Adding mint
    #[account(
        init,
        payer = payer,
        mint::decimals = 6,
        mint::authority = mint.key(),
        mint::freeze_authority = mint.key(),
        seeds = [b"sc-token-mint"],
        bump
    )]
    pub mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,

    #[account(
        init_if_needed,
        payer = payer,
        token::mint = mint,
        token::authority = token_account,
        token::token_program = token_program,
        seeds = [b"sc-token"],
        bump
    )]
    pub token_account: InterfaceAccount<'info, TokenAccount>,
}

#[derive(Accounts)]
pub struct TransferTokens<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"sc-token-mint"],
        bump
    )]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = sender_token_account,
        seeds = [b"sc-token"],
        bump
    )]
    pub sender_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = signer,
        associated_token::token_program = token_program,
    )]
    pub recipient_token_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseCounter<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
  mut,
  close = payer, // close account and return lamports to payer
    )]
    pub counter: Account<'info, Counter>,
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut)]
    pub counter: Account<'info, Counter>,
}

#[account]
#[derive(InitSpace)]
pub struct Counter {
    count: u8,
    mint: Pubkey
}
