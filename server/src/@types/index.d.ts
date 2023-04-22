import type { Socket } from "net";

export interface SocketWithID extends Socket {

    id: string
}