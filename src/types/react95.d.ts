declare module 'react95/dist/themes/original' {
    const originalTheme: any;
    export default originalTheme;
}

declare module 'react95/dist/fonts/ms_sans_serif.woff2' {
    const content: string;
    export default content;
}

declare module 'react95/dist/fonts/ms_sans_serif_bold.woff2' {
    const content: string;
    export default content;
}

declare module 'socket.io-client' {
    export function io(uri: string, options?: any): any;
    export type Socket = any;
}