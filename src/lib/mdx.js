import * as runtime from 'react/jsx-runtime'
import { compile } from '@mdx-js/mdx'

export async function compileMdxToComponent(mdxSource) {
  const compiled = await compile(mdxSource, {
    outputFormat: 'function-body',
    development: process.env.NODE_ENV !== 'production',
    providerImportSource: '@mdx-js/react',
  })

  // Turn the compiled code string into a runnable component
  const code = String(compiled)
  // eslint-disable-next-line no-new-func
  const fn = new Function('runtime', code)
  return fn({ ...runtime }).default
}
