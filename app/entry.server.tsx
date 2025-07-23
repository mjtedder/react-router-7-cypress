import type {
    ActionFunctionArgs,
    EntryContext,
    LoaderFunctionArgs,
} from 'react-router'
import { createReadableStreamFromReadable } from '@react-router/node'
import { ServerRouter } from 'react-router'
import { renderToPipeableStream, type RenderToPipeableStreamOptions } from 'react-dom/server'
import { isbot } from 'isbot'
import { PassThrough } from 'node:stream'

export const streamTimeout = 5_000

/**
 * By default, Remix will handle generating the HTTP Response for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.server
 */

export default function handleRequest(
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    routerContext: EntryContext,
    // If you have middleware enabled:
    // loadContext: unstable_RouterContextProvider
) {

    return new Promise((resolve, reject) => {
        let shellRendered = false
        const userAgent = request.headers.get('user-agent')

        // Ensure requests from bots and SPA Mode renders wait for all content to load before responding
        // https://react.dev/reference/react-dom/server/renderToPipeableStream#waiting-for-all-content-to-load-for-crawlers-and-static-generation
        const readyOption: keyof RenderToPipeableStreamOptions =
            (userAgent && isbot(userAgent)) || routerContext.isSpaMode
                ? 'onAllReady'
                : 'onShellReady'

        const { pipe, abort } = renderToPipeableStream(
            <ServerRouter context={routerContext} url={request.url} />,
            {
                [readyOption]() {
                    shellRendered = true
                    const body = new PassThrough()
                    const stream = createReadableStreamFromReadable(body)

                    responseHeaders.set('Content-Type', 'text/html')

                    resolve(
                        new Response(stream, {
                            headers: responseHeaders,
                            status: responseStatusCode,
                        })
                    )

                    pipe(body)
                },
                onShellError(error: unknown) {
                    reject(error)
                },
                onError(error: unknown) {
                    responseStatusCode = 500
                    // Log streaming rendering errors from inside the shell.  Don't log
                    // errors encountered during initial shell rendering since they'll
                    // reject and get logged in handleDocumentRequest.
                    if (shellRendered) {
                        console.error(error)
                    }
                },
            }
        )

        // Abort the rendering stream after the `streamTimeout` so it has time to
        // flush down the rejected boundaries
        setTimeout(abort, streamTimeout + 1000)
    })
}

export function handleError(
    error: unknown,
    { request }: LoaderFunctionArgs | ActionFunctionArgs
) {
    if (!request.signal.aborted) {
        // Store the error as a global variable so that we can access it from the error
        // page in root.tsx when SHOW_ERROR_DETAILS is true.
        //
        // eslint-disable-next-line no-extra-semi
        ;(global as any).lastServerError = error
        console.error(error)
    }
}
