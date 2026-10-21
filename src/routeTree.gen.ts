/* eslint-disable */
// @ts-nocheck
import { Route as rootRouteImport } from './routes/__root'
import { Route as IndexRouteImport } from './routes/index'
import { Route as ApiPublicAiChatRouteImport } from './routes/api/public/ai-chat'
import { Route as ApiPublicAiModelsRouteImport } from './routes/api/public/ai-models'
import { Route as ApiPublicV1DiagnosticsRouteImport } from './routes/api/public/v1/diagnostics'
import { Route as ApiPublicV1MessagesRouteImport } from './routes/api/public/v1/messages'
import { Route as ApiPublicV1ModelsRouteImport } from './routes/api/public/v1/models'
import { Route as ApiPublicV1ChatCompletionsRouteImport } from './routes/api/public/v1/chat/completions'
import { Route as ApiPublicV1WorkersRegisterRouteImport } from './routes/api/public/v1/workers/register'
import { Route as ApiAdminGatewayRouteImport } from './routes/api/admin/gateway'
const IndexRoute=IndexRouteImport.update({id:'/',path:'/',getParentRoute:()=>rootRouteImport} as any)
const ApiPublicAiChatRoute=ApiPublicAiChatRouteImport.update({id:'/api/public/ai-chat',path:'/api/public/ai-chat',getParentRoute:()=>rootRouteImport} as any)
const ApiPublicAiModelsRoute=ApiPublicAiModelsRouteImport.update({id:'/api/public/ai-models',path:'/api/public/ai-models',getParentRoute:()=>rootRouteImport} as any)
const ApiPublicV1DiagnosticsRoute=ApiPublicV1DiagnosticsRouteImport.update({id:'/api/public/v1/diagnostics',path:'/api/public/v1/diagnostics',getParentRoute:()=>rootRouteImport} as any)
const ApiPublicV1MessagesRoute=ApiPublicV1MessagesRouteImport.update({id:'/api/public/v1/messages',path:'/api/public/v1/messages',getParentRoute:()=>rootRouteImport} as any)
const ApiPublicV1ModelsRoute=ApiPublicV1ModelsRouteImport.update({id:'/api/public/v1/models',path:'/api/public/v1/models',getParentRoute:()=>rootRouteImport} as any)
const ApiPublicV1ChatCompletionsRoute=ApiPublicV1ChatCompletionsRouteImport.update({id:'/api/public/v1/chat/completions',path:'/api/public/v1/chat/completions',getParentRoute:()=>rootRouteImport} as any)
const ApiPublicV1WorkersRegisterRoute=ApiPublicV1WorkersRegisterRouteImport.update({id:'/api/public/v1/workers/register',path:'/api/public/v1/workers/register',getParentRoute:()=>rootRouteImport} as any)
const ApiAdminGatewayRoute=ApiAdminGatewayRouteImport.update({id:'/api/admin/gateway',path:'/api/admin/gateway',getParentRoute:()=>rootRouteImport} as any)
export interface FileRoutesByFullPath { '/':typeof IndexRoute; '/api/public/ai-chat':typeof ApiPublicAiChatRoute; '/api/public/ai-models':typeof ApiPublicAiModelsRoute; '/api/public/v1/diagnostics':typeof ApiPublicV1DiagnosticsRoute; '/api/public/v1/messages':typeof ApiPublicV1MessagesRoute; '/api/public/v1/models':typeof ApiPublicV1ModelsRoute; '/api/public/v1/chat/completions':typeof ApiPublicV1ChatCompletionsRoute; '/api/public/v1/workers/register':typeof ApiPublicV1WorkersRegisterRoute; '/api/admin/gateway':typeof ApiAdminGatewayRoute }
export interface FileRoutesByTo extends FileRoutesByFullPath {}
export interface FileRoutesById { __root__:typeof rootRouteImport; '/':typeof IndexRoute; '/api/public/ai-chat':typeof ApiPublicAiChatRoute; '/api/public/ai-models':typeof ApiPublicAiModelsRoute; '/api/public/v1/diagnostics':typeof ApiPublicV1DiagnosticsRoute; '/api/public/v1/messages':typeof ApiPublicV1MessagesRoute; '/api/public/v1/models':typeof ApiPublicV1ModelsRoute; '/api/public/v1/chat/completions':typeof ApiPublicV1ChatCompletionsRoute; '/api/public/v1/workers/register':typeof ApiPublicV1WorkersRegisterRoute; '/api/admin/gateway':typeof ApiAdminGatewayRoute }
export interface FileRouteTypes { fileRoutesByFullPath:FileRoutesByFullPath; fullPaths:keyof FileRoutesByFullPath; fileRoutesByTo:FileRoutesByTo; to:keyof FileRoutesByFullPath; id:keyof FileRouteTypes['fileRoutesById']; fileRoutesById:FileRoutesById }
declare module '@tanstack/react-router' { interface FileRoutesByPath { '/api/admin/gateway':{ id:'/api/admin/gateway'; path:'/api/admin/gateway'; fullPath:'/api/admin/gateway'; preLoaderRoute:typeof ApiAdminGatewayRouteImport; parentRoute:typeof rootRouteImport } } }
const rootRouteChildren={IndexRoute,ApiPublicAiChatRoute,ApiPublicAiModelsRoute,ApiPublicV1DiagnosticsRoute,ApiPublicV1MessagesRoute,ApiPublicV1ModelsRoute,ApiPublicV1ChatCompletionsRoute,ApiPublicV1WorkersRegisterRoute,ApiAdminGatewayRoute}
export const routeTree=rootRouteImport._addFileChildren(rootRouteChildren)._addFileTypes<FileRouteTypes>()
import type { getRouter } from './router.tsx'
import type { startInstance } from './start.ts'
declare module '@tanstack/react-start' { interface Register { ssr:true; router:Awaited<ReturnType<typeof getRouter>>; config:Awaited<ReturnType<typeof startInstance.getOptions>> } }
