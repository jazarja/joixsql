import { Joi, TableEngine, config, Ecosystem, MigrationManager } from '../index'
import { expect } from 'chai';
import 'mocha';

const main = () => {

    const ecosystem = new Ecosystem()

    const UserModel = Joi.object({
        id: Joi.number().autoIncrement().primaryKey().group(['post']),
        username: Joi.string().min(3).max(20).lowercase().required().unique().group(['post']),
        created_at: Joi.date().required().default('now'),
        access_token: Joi.string().uuid().required().unique(),
        mine: Joi.string().uuid().required().foreignKey('chats', 'ole').noPopulate()
    })


    const ChatModel = Joi.object({
        id: Joi.number().autoIncrement().primaryKey(),
        created_at: Joi.date().required().default('now'),
        user_1: Joi.number().positive().required().foreignKey('users', 'id', 'post'),
        user_2: Joi.number().positive().required().foreignKey('users', 'id', 'post'),
        last_message: Joi.number().positive().populate('messages', 'id')
    })


    const MessageModel = Joi.object({
        id: Joi.number().autoIncrement().primaryKey(),
        content: Joi.string().required().min(1).max(4000),
        created_at: Joi.date().required().default('now'),
        user: Joi.number().positive().required().foreignKey('THIS_KEY_DOESNT_EXIST', 'id', 'post'),
        user_2: Joi.number().positive().required().foreignKey('users', 'id', 'post'),
        chat: Joi.number().positive().required().foreignKey('chats', 'id').deleteCascade(),
    })


    const users = ecosystem.add({schema: UserModel, tableName: 'users'})
    const chats = ecosystem.add({schema: ChatModel, tableName: 'chats'})
    const messages = ecosystem.add({schema: MessageModel, tableName: 'messages'})

    it('verifyCrossedPopulateValues', () => {
        expect(() => ecosystem.verify(users).crossedPopulatedValues()).to.not.throw(Error)
        expect(() => ecosystem.verify(chats).crossedPopulatedValues()).to.throw(Error)
        expect(() => ecosystem.verify(messages).crossedPopulatedValues()).to.throw(Error)
    })

    it('verifyForeignKeyExistences', () => {
        expect(() => ecosystem.verify(users).foreignKeyExistences()).to.throw(Error)
        expect(() => ecosystem.verify(chats).foreignKeyExistences()).to.not.throw(Error)
        expect(() => ecosystem.verify(messages).foreignKeyExistences()).to.throw(Error)
    })


    const UserModel2 = Joi.object({
        id: Joi.number().autoIncrement().primaryKey().group(['post']),
        username: Joi.string().min(3).max(20).lowercase().required().unique().group(['post']),
        created_at: Joi.date().required().default('now'),
        access_token: Joi.string().uuid().required().unique(),
        check: Joi.string().uuid().required().populate('DOESNT_EXIST', 'id')
    })

    const ChatModel2 = Joi.object({
        id: Joi.number().autoIncrement().primaryKey(),
        created_at: Joi.date().required().default('now'),
        user_1: Joi.number().positive().required().populate('users', 'DOESNT_EXIST', 'post'),
        user_2: Joi.number().positive().required().populate('users', 'id', 'post'),
        last_message: Joi.number().positive().populate('messages', 'id')
    })

    const MessageModel2 = Joi.object({
        id: Joi.number().autoIncrement().primaryKey(),
        content: Joi.string().required().min(1).max(4000),
        created_at: Joi.date().required().default('now'),
        user: Joi.number().positive().required().foreignKey('users', 'id', 'postos'),
        chat: Joi.number().positive().required().populate('chats', 'id')
    })
    
    const users2 = ecosystem.add({schema: UserModel2, tableName: 'users2'})
    const chats2 = ecosystem.add({schema: ChatModel2, tableName: 'chats2'})
    const messages2 = ecosystem.add({schema: MessageModel2, tableName: 'messages2'})

    it('verifyPopulateExistences', () => {
        expect(() => ecosystem.verify(chats2).populateExistences() ).to.throw(Error)
        expect(() => ecosystem.verify(users2).populateExistences() ).to.throw(Error)
        expect(() => ecosystem.verify(messages2).populateExistences() ).to.not.throw(Error)
    })

    it('verifyGroupingValuesExistence', () => {
        expect(() => ecosystem.verify(chats).groupingValuesExistence()).to.not.throw(Error)
        expect(() => ecosystem.verify(messages2).groupingValuesExistence()).to.throw(Error)
    })

    const UserModel3 = Joi.object({
        id: Joi.number().autoIncrement().primaryKey().group(['post']),
        username: Joi.string().min(3).max(20).lowercase().required().unique().group(['post']),
        created_at: Joi.date().required().default('now'),
        access_token: Joi.string().uuid().required().unique()
    }).with('username', 'access_token')


    const ChatModel3 = Joi.object({
        id: Joi.number().autoIncrement().primaryKey(),
        created_at: Joi.date().required().default('now'),
        user_1: Joi.number().positive().required().populate('users3', 'id', 'post'),
        user_2: Joi.number().positive().required().populate('users3', 'id', 'post'),
        last_message: Joi.number().positive().populate('messages3', 'id')
    })

    const MessageModel3 = Joi.object({
        id: Joi.number().autoIncrement().primaryKey(),
        content: Joi.string().required().min(1).max(4000),
        created_at: Joi.date().required().default('now'),
        user: Joi.number().positive().required().foreignKey('users3', 'id', 'post'),
        chat: Joi.number().positive().required().foreignKey('chats3', 'id').deleteCascade().noPopulate(),
    })

    const users3 = ecosystem.add({schema: UserModel3, tableName: 'users3'})
    const chats3 = ecosystem.add({schema: ChatModel3, tableName: 'chats3'})
    const messages3 = ecosystem.add({schema: MessageModel3, tableName: 'messages3'})

    it('verifyCrossedForeignKey', () => {
        expect(() => ecosystem.verify(messages3).crossedForeignKey() ).to.not.throw(Error)
        expect(() => ecosystem.verify(chats3).crossedForeignKey() ).to.not.throw(Error)
        expect(() => ecosystem.verify(users3).crossedForeignKey() ).to.not.throw(Error)
    })

    const UserModel4 = Joi.object({
        id: Joi.number().autoIncrement().primaryKey().group(['post']),
        username: Joi.string().min(3).max(20).lowercase().required().unique().group(['post']),
        created_at: Joi.date().required().default('now'),
        access_token: Joi.string().uuid().required().unique()
    }).with('username', 'access_token')


    const ChatModel4 = Joi.object({
        id: Joi.number().autoIncrement().primaryKey(),
        created_at: Joi.date().required().default('now'),
        user_1: Joi.number().positive().required().foreignKey('users4', 'id', 'post').deleteCascade(),
        user_2: Joi.number().positive().required().foreignKey('users4', 'id', 'post').deleteCascade(),
        last_message: Joi.number().positive().populate('messages4', 'id')
    })

    const MessageModel4 = Joi.object({
        id: Joi.number().autoIncrement().primaryKey(),
        content: Joi.string().required().min(1).max(4000),
        created_at: Joi.date().required().default('now'),
        user: Joi.number().positive().required().foreignKey('users4', 'id', 'post').deleteCascade(),
        chat: Joi.number().positive().required().foreignKey('chats4', 'id').deleteCascade().noPopulate(),
    })

    const users4 = ecosystem.add({schema: UserModel4, tableName: 'users4'})
    const chats4 = ecosystem.add({schema: ChatModel4, tableName: 'chat4'})
    const messages4 = ecosystem.add({schema: MessageModel4, tableName: 'messages4'})

    it('verifyCrossedForeignKey part 2', () => {
        expect(() => ecosystem.verify(messages4).crossedForeignKey() ).to.throw(Error)
        expect(() => ecosystem.verify(chats4).crossedForeignKey() ).to.not.throw(Error)
        expect(() => ecosystem.verify(users4).crossedForeignKey() ).to.not.throw(Error)
    })


    it('buildAllFromEcosystem', async () => {

        ecosystem.reset()
        config.disableLog()
        config.setEcosystem(ecosystem)

        const User = Joi.object({
            id: Joi.number().autoIncrement().primaryKey(),
            email: Joi.string().email().unique().lowercase().required(),
        })

        const Todo = Joi.object({
            id: Joi.number().autoIncrement().primaryKey(),
            content: Joi.string().min(1).max(400).default(''),
            created_at: Joi.date().default('now'),
            user: Joi.number().foreignKey('users_ecosystem', 'id').required()
        })

        const todos = ecosystem.add({schema: Todo, tableName: 'todos_ecosystem'})
        const users = ecosystem.add({schema: User, tableName: 'users_ecosystem'})

        await TableEngine.buildAllFromEcosystem()

        const hasTodos = await config.mysqlConnexion().schema.hasTable(todos.tableName)
        const hasUsers = await config.mysqlConnexion().schema.hasTable(users.tableName)
        const hasTodosLocally = MigrationManager.schema().lastFilename(todos.tableName) != null
        const hasUsersLocally = MigrationManager.schema().lastFilename(users.tableName) != null

        expect(hasTodos)
        expect(hasUsers)
        expect(hasTodosLocally)
        expect(hasUsersLocally)
        await new Promise(resolve => setTimeout(resolve, 1000));
    })

    it('dropAllFromEcosystem', async () => {
        await TableEngine.dropAllFromEcosystem()

        const hasTodos = await config.mysqlConnexion().schema.hasTable('todos_ecosystem')
        const hasUsers = await config.mysqlConnexion().schema.hasTable('users_ecosystem')
        const hasTodosLocally = MigrationManager.schema().lastFilename('todos_ecosystem') != null
        const hasUsersLocally = MigrationManager.schema().lastFilename('users_ecosystem') != null

        expect(hasTodos).to.equal(false)
        expect(hasUsers).to.equal(false)
        expect(hasTodosLocally).to.equal(false)
        expect(hasUsersLocally).to.equal(false)
    })

}

main()