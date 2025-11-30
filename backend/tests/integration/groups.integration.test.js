"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../../src/app"));
describe('Groups Integration Tests', () => {
    let authToken;
    let userId;
    let testEmail;
    beforeEach(async () => {
        testEmail = `test${Date.now()}@example.com`;
        // Créer un utilisateur et se connecter
        const registerResponse = await (0, supertest_1.default)(app_1.default)
            .post('/api/auth/register')
            .send({
            email: testEmail,
            pseudo: `testuser${Date.now()}`,
            password: 'password123'
        });
        const loginResponse = await (0, supertest_1.default)(app_1.default)
            .post('/api/auth/login')
            .send({
            email: testEmail,
            password: 'password123'
        });
        authToken = loginResponse.body.data.accessToken;
        userId = loginResponse.body.data.user.id;
    });
    describe('POST /api/groups', () => {
        it('should create a new group successfully', async () => {
            const groupData = {
                name: 'Test Group',
                ffvbSourceUrl: 'https://example.com/ffvb'
            };
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/api/groups')
                .set('Authorization', `Bearer ${authToken}`)
                .send(groupData)
                .expect(201);
            expect(response.body.code).toBe('SUCCESS');
            expect(response.body.data.name).toBe(groupData.name);
            expect(response.body.data.inviteCode).toBeDefined();
            expect(response.body.data.members).toHaveLength(1);
            expect(response.body.data.members[0].role).toBe('OWNER');
        });
        it('should return error without authentication', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/api/groups')
                .send({ name: 'Test Group' })
                .expect(401);
            expect(response.body.code).toBe('UNAUTHORIZED');
        });
    });
    describe('GET /api/groups', () => {
        beforeEach(async () => {
            // Créer un groupe
            await (0, supertest_1.default)(app_1.default)
                .post('/api/groups')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                name: 'Test Group',
                ffvbSourceUrl: 'https://example.com/ffvb'
            });
        });
        it('should return user groups', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get('/api/groups')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(response.body.code).toBe('SUCCESS');
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].name).toBe('Test Group');
        });
    });
    describe('POST /api/groups/join', () => {
        let inviteCode;
        beforeEach(async () => {
            // Créer un groupe et récupérer le code d'invitation
            const createResponse = await (0, supertest_1.default)(app_1.default)
                .post('/api/groups')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                name: 'Test Group',
                ffvbSourceUrl: 'https://example.com/ffvb'
            });
            inviteCode = createResponse.body.data.inviteCode;
        });
        it('should join group with valid invite code', async () => {
            // Créer un deuxième utilisateur
            const user2Email = `user2${Date.now()}@example.com`;
            await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/register')
                .send({
                email: user2Email,
                pseudo: `user2${Date.now()}`,
                password: 'password123'
            });
            const loginResponse = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/login')
                .send({
                email: user2Email,
                password: 'password123'
            });
            const user2Token = loginResponse.body.data.accessToken;
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/api/groups/join')
                .set('Authorization', `Bearer ${user2Token}`)
                .send({ inviteCode })
                .expect(200);
            expect(response.body.code).toBe('SUCCESS');
            expect(response.body.data.group.name).toBe('Test Group');
            expect(response.body.data.role).toBe('MEMBER');
        });
        it('should return error with invalid invite code', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/api/groups/join')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ inviteCode: 'INVALID' })
                .expect(400);
            expect(response.body.code).toBe('ERROR');
        });
    });
    describe('GET /api/groups/:groupId', () => {
        let groupId;
        beforeEach(async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .post('/api/groups')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                name: 'Test Group',
                ffvbSourceUrl: 'https://example.com/ffvb'
            });
            groupId = response.body.data.id;
        });
        it('should return group details', async () => {
            const response = await (0, supertest_1.default)(app_1.default)
                .get(`/api/groups/${groupId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(response.body.code).toBe('SUCCESS');
            expect(response.body.data.name).toBe('Test Group');
            expect(response.body.data.members).toHaveLength(1);
        });
        it('should return error for non-member', async () => {
            // Créer un utilisateur qui n'est pas membre
            const user2Email = `user2${Date.now()}@example.com`;
            await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/register')
                .send({
                email: user2Email,
                pseudo: `user2${Date.now()}`,
                password: 'password123'
            });
            const loginResponse = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/login')
                .send({
                email: user2Email,
                password: 'password123'
            });
            const user2Token = loginResponse.body.data.accessToken;
            const response = await (0, supertest_1.default)(app_1.default)
                .get(`/api/groups/${groupId}`)
                .set('Authorization', `Bearer ${user2Token}`)
                .expect(404);
            expect(response.body.code).toBe('ERROR');
        });
    });
});
