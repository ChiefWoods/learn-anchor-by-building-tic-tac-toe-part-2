import { AnchorProvider, workspace, setProvider, Program, AnchorError } from '@coral-xyz/anchor';
import { TicTacToe } from '../target/types/tic_tac_toe';
import { Keypair, PublicKey } from '@solana/web3.js';
import { assert } from 'chai';

describe('TicTacToe', () => {
  // Configure the client to use the local cluster.
  setProvider(AnchorProvider.env());

  const program = workspace.TicTacToe as Program<TicTacToe>;
  const programProvider = program.provider as AnchorProvider;

  async function play(
    program: Program<TicTacToe>,
    game: PublicKey,
    player: Keypair,
    tile: { row: number, column: number },
    expectedTurn: number,
    expectedGameState:
      { active: {} }
      | { won: { winner: PublicKey } }
      | { tie: {} },
    expectedBoard: Array<Array<{ x: {} } | { o: {} } | null>>
  ): Promise<void> {
    await program.methods.play(tile).accounts({ player: player.publicKey, game }).signers([player]).rpc();
    const gameData = await program.account.game.fetch(game);
    assert.equal(gameData.turn, expectedTurn);
    assert.deepEqual(gameData.state, expectedGameState);
    assert.deepEqual(gameData.board, expectedBoard);
  }

  it('Is initialized!', async () => {
    // Add your test here.
    const playerOne = Keypair.generate();
    const playerTwo = Keypair.generate();
    const gameId = "game-1";

    const [gamePublicKey, _] = PublicKey.findProgramAddressSync([Buffer.from('game'), playerOne.publicKey.toBuffer(), Buffer.from(gameId)], program.programId);

    const sg = await programProvider.connection.requestAirdrop(playerOne.publicKey, 1_000_000_000);
    await programProvider.connection.confirmTransaction(sg);

    const ix = program.methods.setupGame(playerTwo.publicKey, gameId).accounts({ game: gamePublicKey, playerOne: playerOne.publicKey }).signers([playerOne]);
    await ix.rpc();
    const gameData = await program.account.game.fetch(gamePublicKey);
    assert.equal(gameData.turn, 1);
    assert.deepEqual(gameData.players, [playerOne.publicKey, playerTwo.publicKey]);
    assert.deepEqual(gameData.state.active, {});
    assert.deepEqual(gameData.board, [[null, null, null], [null, null, null], [null, null, null]])
  });

  it('has player one win', async () => {
    const playerOne = Keypair.generate();
    const playerTwo = Keypair.generate();
    const gameId = "game-2";

    const [gamePublicKey] = PublicKey.findProgramAddressSync([Buffer.from("game"), playerOne.publicKey.toBuffer(), Buffer.from(gameId)], program.programId);

    const sg = await programProvider.connection.requestAirdrop(playerOne.publicKey, 1_000_000_000);
    await programProvider.connection.confirmTransaction(sg);

    await program.methods.setupGame(playerTwo.publicKey, gameId).accounts({ game: gamePublicKey, playerOne: playerOne.publicKey }).signers([playerOne]).rpc();
    const gameData = await program.account.game.fetch(gamePublicKey);
    assert.equal(gameData.turn, 1);

    await play(program, gamePublicKey, playerOne, { row: 0, column: 0 }, 2, { active: {} }, [[{ x: {} }, null, null], [null, null, null], [null, null, null]]);
    await play(program, gamePublicKey, playerTwo, { row: 1, column: 0 }, 3, { active: {} }, [[{ x: {} }, null, null], [{ o: {} }, null, null], [null, null, null]]);
    await play(program, gamePublicKey, playerOne, { row: 0, column: 1 }, 4, { active: {} }, [[{ x: {} }, { x: {} }, null], [{ o: {} }, null, null], [null, null, null]]);
    await play(program, gamePublicKey, playerTwo, { row: 1, column: 1 }, 5, { active: {} }, [[{ x: {} }, { x: {} }, null], [{ o: {} }, { o: {} }, null], [null, null, null]]);
    await play(program, gamePublicKey, playerOne, { row: 0, column: 2 }, 5, { won: { winner: playerOne.publicKey } }, [[{ x: {} }, { x: {} }, { x: {} }], [{ o: {} }, { o: {} }, null], [null, null, null]]);
  })

  it('handles ties', async () => {
    const playerOne = Keypair.generate();
    const playerTwo = Keypair.generate();
    const gameId = "game-3";

    const [gamePublicKey] = PublicKey.findProgramAddressSync([Buffer.from('game'), playerOne.publicKey.toBuffer(), Buffer.from(gameId)], program.programId);

    const sg = await programProvider.connection.requestAirdrop(playerOne.publicKey, 1_000_000_000);
    await programProvider.connection.confirmTransaction(sg);

    await program.methods.setupGame(playerTwo.publicKey, gameId).accounts({ game: gamePublicKey, playerOne: playerOne.publicKey }).signers([playerOne]).rpc();

    await play(program, gamePublicKey, playerOne, { row: 0, column: 0 }, 2, { active: {} }, [[{ x: {} }, null, null], [null, null, null], [null, null, null]]);
    await play(program, gamePublicKey, playerTwo, { row: 1, column: 0 }, 3, { active: {} }, [[{ x: {} }, null, null], [{ o: {} }, null, null], [null, null, null]]);
    await play(program, gamePublicKey, playerOne, { row: 2, column: 0 }, 4, { active: {} }, [[{ x: {} }, null, null], [{ o: {} }, null, null], [{ x: {} }, null, null]]);
    await play(program, gamePublicKey, playerTwo, { row: 0, column: 1 }, 5, { active: {} }, [[{ x: {} }, { o: {} }, null], [{ o: {} }, null, null], [{ x: {} }, null, null]]);
    await play(program, gamePublicKey, playerOne, { row: 0, column: 2 }, 6, { active: {} }, [[{ x: {} }, { o: {} }, { x: {} }], [{ o: {} }, null, null], [{ x: {} }, null, null]]);
    await play(program, gamePublicKey, playerTwo, { row: 2, column: 2 }, 7, { active: {} }, [[{ x: {} }, { o: {} }, { x: {} }], [{ o: {} }, null, null], [{ x: {} }, null, { o: {} }]]);
    await play(program, gamePublicKey, playerOne, { row: 1, column: 2 }, 8, { active: {} }, [[{ x: {} }, { o: {} }, { x: {} }], [{ o: {} }, null, { x: {} }], [{ x: {} }, null, { o: {} }]]);
    await play(program, gamePublicKey, playerTwo, { row: 1, column: 1 }, 9, { active: {} }, [[{ x: {} }, { o: {} }, { x: {} }], [{ o: {} }, { o: {} }, { x: {} }], [{ x: {} }, null, { o: {} }]]);
    await play(program, gamePublicKey, playerOne, { row: 2, column: 1 }, 9, { tie: {} }, [[{ x: {} }, { o: {} }, { x: {} }], [{ o: {} }, { o: {} }, { x: {} }], [{ x: {} }, { x: {} }, { o: {} }]]);
  })

  it('handles invalid plays', async () => {
    const playerOne = Keypair.generate();
    const playerTwo = Keypair.generate();
    const gameId = "game-4";

    const [gamePublicKey] = PublicKey.findProgramAddressSync([Buffer.from('game'), playerOne.publicKey.toBuffer(), Buffer.from(gameId)], program.programId);

    const sg = await programProvider.connection.requestAirdrop(playerOne.publicKey, 1_000_000_000);
    await programProvider.connection.confirmTransaction(sg);

    await program.methods.setupGame(playerTwo.publicKey, gameId).accounts({ game: gamePublicKey, playerOne: playerOne.publicKey }).signers([playerOne]).rpc();

    try {
      await play(program, gamePublicKey, playerTwo, { row: 0, column: 0 }, 2, { active: {} }, [[{ o: {} }, null, null], [null, null, null], [null, null, null]]);
    } catch (e) {
      assert.instanceOf(e, AnchorError);
      assert.equal(e.error.errorCode.code, "NotPlayersTurn");
      assert.equal(e.error.errorCode.number, 6003);
      assert.deepEqual(e.program, program.programId);
    }

    try {
      await play(program, gamePublicKey, playerOne, { row: 0, column: 3 }, 2, { active: {} }, [[{ x: {} }, null, null], [null, null, null], [null, null, null]]);
    } catch (e) {
      assert.instanceOf(e, AnchorError);
      assert.equal(e.error.errorCode.number, 6000);
      assert.equal(e.error.errorCode.code, "TileOutOfBounds");
    }

    try {
      await play(program, gamePublicKey, playerOne, { row: 0, column: 0 }, 2, { active: {} }, [[{ x: {} }, null, null], [null, null, null], [null, null, null]]);
      await play(program, gamePublicKey, playerTwo, { row: 0, column: 0 }, 3, { active: {} }, [[{ o: {} }, null, null], [null, null, null], [null, null, null]]);
    } catch (e) {
      assert.instanceOf(e, AnchorError);
      assert.equal(e.error.errorCode.number, 6001);
      assert.equal(e.error.errorCode.code, "TileAlreadySet");
    }

    await play(program, gamePublicKey, playerTwo, { row: 1, column: 0 }, 3, { active: {} }, [[{ x: {} }, null, null], [{ o: {} }, null, null], [null, null, null]]);
    await play(program, gamePublicKey, playerOne, { row: 0, column: 1 }, 4, { active: {} }, [[{ x: {} }, { x: {} }, null], [{ o: {} }, null, null], [null, null, null]]);
    await play(program, gamePublicKey, playerTwo, { row: 1, column: 1 }, 5, { active: {} }, [[{ x: {} }, { x: {} }, null], [{ o: {} }, { o: {} }, null], [null, null, null]]);
    await play(program, gamePublicKey, playerOne, { row: 0, column: 2 }, 5, { won: { winner: playerOne.publicKey } }, [[{ x: {} }, { x: {} }, { x: {} }], [{ o: {} }, { o: {} }, null], [null, null, null]]);

    try {
      await play(program, gamePublicKey, playerOne, { row: 2, column: 0 }, 6, { won: { winner: playerOne.publicKey } }, [[{ x: {} }, { x: {} }, { x: {} }], [{ o: {} }, { o: {} }, null], [{ x: {} }, null, null]]);
    } catch (e) {
      assert.instanceOf(e, AnchorError);
      assert.equal(e.error.errorCode.number, 6002);
      assert.equal(e.error.errorCode.code, "GameAlreadyOver");
    }
  })
});