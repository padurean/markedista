const fs = require('fs')
const {promisify} = require('util')
const marked = require('marked')
const colors = require('colors')

colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});

const toRenderDirPath = 'posts-md/to-render'
const renderedDirPath = 'posts-md/rendered'
const htmlOutputDirPath = 'posts'
const fragmentsDirPath = 'fragments'
const enc = 'utf8'

const readDir = promisify(fs.readdir)
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)
const renameFile = promisify(fs.rename)

const render = async () => {
  try {
    console.info(`Scanning ${toRenderDirPath} for md files to render ...`.info)
    const mdFilesNames = await readDir(toRenderDirPath)
    console.warn(`${mdFilesNames.length} new md files found`.warn)
    if (mdFilesNames.length === 0)
      return
    const headerHtml = await readFile(`${fragmentsDirPath}/header.html`, enc)
    const footerHtml = await readFile(`${fragmentsDirPath}/footer.html`, enc)
    mdFilesNames.forEach(async mdFileName => {
      try {
        console.info(`Rendering ${mdFileName} ...`.info)
        const mdFilePath = `${toRenderDirPath}/${mdFileName}`
        const mdContent = await readFile(mdFilePath, enc)
        const renderedHtml = marked(mdContent)
        const htmlFilePath = `${htmlOutputDirPath}/${mdFileName}.html`
        console.info(`Writing ${htmlFilePath} ...`.info)
        await writeFile(htmlFilePath, `${headerHtml}\n${renderedHtml}\n${footerHtml}`)
        const renderedMdFilePath = `${renderedDirPath}/${mdFileName}`
        console.info(`Moving ${mdFileName} to ${renderedDirPath} ...`.info)
        await renameFile(mdFilePath, renderedMdFilePath)
      } catch (e) {
        console.error(`${e}`.error)
      }
    })
  } catch (e) {
    console.error(`${e}`.error)
  }
}
render()