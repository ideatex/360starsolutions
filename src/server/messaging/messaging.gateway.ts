import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map to track active client connections: shareholderId -> socketId
  private activeClients = new Map<string, string>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.headers.authorization || client.handshake.query?.token;
      const token = Array.isArray(authHeader) ? authHeader[0] : authHeader;
      if (!token) {
        client.disconnect();
        return;
      }
      const actualToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
      const decoded = this.jwtService.verify(actualToken, {
        secret: process.env.JWT_SECRET || 'super-secret-key-for-dev',
      });
      if (decoded && decoded.sub) {
        this.activeClients.set(decoded.sub, client.id);
        console.log(`WebSocket connected: Shareholder ${decoded.sub} (${client.id})`);
      } else {
        client.disconnect();
      }
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    for (const [shareholderId, socketId] of this.activeClients.entries()) {
      if (socketId === client.id) {
        this.activeClients.delete(shareholderId);
        console.log(`WebSocket disconnected: Shareholder ${shareholderId}`);
        break;
      }
    }
  }

  sendMessageToUser(shareholderId: string, event: string, payload: any) {
    const socketId = this.activeClients.get(shareholderId);
    if (socketId) {
      this.server.to(socketId).emit(event, payload);
    }
  }
}
