import { execSync } from "child_process"
import fs from "fs-extra"
import parseGitConfig from "parse-git-config"
import path from "path"
import toml from "toml"
import { Args } from "./argv"
import getDocusaurusConfig from "./getDocusaurusConfig"

const TEMPLATE_PATH = path.join(__dirname, "../template")
const ROOT_PATH = path.join(TEMPLATE_PATH, "root")

const INDEX_EXTS = ["html", "js", "mdx", "md"]
const COPY_FOLDERS = ["blog", "docs", "pages"] as const
export type FoldersEnabled = { [index in typeof COPY_FOLDERS[number]]: boolean }

export type Config = Partial<{
  // Moonwave
  gitRepoUrl: string
  gitSourceBranch: string
  title: string

  // Docusaurus
  docusaurus: Partial<{
    title: string
    tagline: string
    url: string
    baseUrl: string
    onBrokenLinks: string
    onBrokenMarkdownLinks: string
    favicon: string
    organizationName: string
    projectName: string
  }>

  navbar: Partial<{
    hideableSidebar: boolean
    title: string
    logo: { alt: string; src: string }
    items: { to: string; label: string; position: "left" | "right" }[]
  }>

  home: Partial<{
    enabled: boolean

    features: {
      title: string
      description: string
      image: string
    }[]
  }>

  footer: Partial<{
    style: string
    links: {
      title: string
      copyright: string
      items: { label: string; to: string }[]
    }[]
  }>
}>

function getGitRepoUrl(): string | undefined {
  const gitConfig = parseGitConfig.sync()

  if (gitConfig) {
    return gitConfig['remote "origin"'].url.replace(/\.git$/, "")
  }
}

function readConfig(projectDir: string): Config {
  const configPath = path.join(projectDir, "moonwave")

  if (fs.existsSync(configPath + ".toml")) {
    return toml.parse(
      fs.readFileSync(configPath + ".toml", { encoding: "utf-8" })
    )
  } else if (fs.existsSync(configPath + ".json")) {
    return fs.readJSONSync(configPath + ".json")
  }

  return {}
}

function getConfig(projectDir: string): Config {
  const gitRepoUrl = getGitRepoUrl()

  const [, repoAuthor, repoName] =
    gitRepoUrl?.match(/^https?:\/\/.+\/(.+)\/(.+)$/) || []

  const config = readConfig(projectDir)

  // Note: Only copying values from other places in the config should go here.
  // Default values for docusaurus.config.js belong in getDocusaurusConfig
  return {
    title: repoName,
    gitRepoUrl,
    ...config,

    docusaurus: {
      projectName: repoName,
      organizationName: repoAuthor,
      title: config.title ?? repoName,
      baseUrl: repoName ? `/${repoName}/` : "/",
      ...config.docusaurus,
    },

    navbar: {
      title: config.title ?? config.docusaurus?.title ?? repoName,
      ...config.navbar,
    },
  }
}

function makeHomePage(projectDir: string, tempDir: string, config: Config) {
  if (
    INDEX_EXTS.filter((ext) =>
      fs.existsSync(path.join(projectDir, "pages", "index." + ext))
    ).length === 0
  ) {
    fs.ensureDirSync(path.join(tempDir, "pages"))

    INDEX_EXTS.forEach((ext) =>
      fs.removeSync(path.join(tempDir, "pages", "index." + ext))
    )

    if (config.home?.enabled) {
      const features = config.home?.features?.map((feature) => {
        if (feature.image && feature.image.startsWith("/")) {
          feature.image = config.docusaurus?.baseUrl + feature.image

          return feature
        }
      })

      const indexSource = fs
        .readFileSync(path.join(TEMPLATE_PATH, "home", "index.js"), {
          encoding: "utf-8",
        })
        .replace("/***features***/", JSON.stringify(features ?? null))

      fs.writeFileSync(path.join(tempDir, "pages", "index.js"), indexSource)

      fs.copyFileSync(
        path.join(TEMPLATE_PATH, "home", "index.module.css"),
        path.join(tempDir, "pages", "index.module.css")
      )
    } else {
      const indexPath = path.join(tempDir, "pages", "index.md")
      const readmePath = path.join(projectDir, "README.md")
      if (fs.existsSync(readmePath)) {
        fs.copyFileSync(readmePath, indexPath)
      } else {
        fs.writeFileSync(
          indexPath,
          `# ${config.title}\nThis project doesn't have a README. If it had a README.md in its root directory, you would be reading that right now.`
        )
      }
    }
  }
}

function writeDocusaurusConfig(
  tempDir: string,
  args: Args,
  config: Config,
  foundFolders: FoldersEnabled
) {
  const docusaurusConfigPath = path.join(tempDir, "./docusaurus.config.js")
  const newDocusaurusConfig =
    "module.exports = " +
    JSON.stringify(
      getDocusaurusConfig({
        codePaths: args.code,
        enablePlugins: foundFolders,
        config,
      }),
      null,
      2
    )

  if (
    fs.existsSync(docusaurusConfigPath) &&
    fs.readFileSync(docusaurusConfigPath, { encoding: "utf-8" }) ===
      newDocusaurusConfig
  ) {
    return false
  } else {
    fs.writeFileSync(docusaurusConfigPath, newDocusaurusConfig)
    return true
  }
}

function copyContentFolders(
  projectDir: string,
  tempDir: string
): FoldersEnabled {
  return Object.fromEntries(
    COPY_FOLDERS.map((folder) => {
      const folderPath = path.join(projectDir, folder)
      const targetPath = path.join(tempDir, folder)

      if (fs.existsSync(folderPath)) {
        console.log("removed", targetPath)
        fs.copySync(folderPath, targetPath)
        return true
      } else {
        return false
      }
    }).map((wasFound, index) => [COPY_FOLDERS[index], wasFound])
  ) as FoldersEnabled
}

export interface PreparedProject {
  tempDir: string
  projectDir: string

  watchPaths: string[]

  docusaurusConfigModified: boolean
}

export function prepareProject(
  projectDir: string,
  args: Args
): PreparedProject {
  const config = getConfig(projectDir)

  const tempDir = path.join(projectDir, "./.moonwave-temp")

  if (args.fresh && fs.existsSync(tempDir)) {
    for (const file of fs
      .readdirSync(tempDir)
      .filter((name) => name !== "node_modules")) {
      fs.removeSync(path.join(tempDir, file))
    }
  }

  fs.copySync(ROOT_PATH, tempDir)

  // Create home page or copy readme
  makeHomePage(projectDir, tempDir, config)

  const foundFolders = copyContentFolders(projectDir, tempDir)

  const docusaurusConfigModified = writeDocusaurusConfig(
    tempDir,
    args,
    config,
    foundFolders
  )

  // TODO: Hash package.json / lockfile and additionally reinstall when changed
  if (!fs.existsSync(path.join(tempDir, "./node_modules"))) {
    console.log("Installing dependencies (this might take awhile)...")

    execSync("npm i", {
      cwd: tempDir,
      stdio: "inherit",
    })
  }

  return {
    docusaurusConfigModified,
    tempDir,
    projectDir,
    watchPaths: [
      path.join(projectDir, "moonwave.toml"),
      path.join(projectDir, "moonwave.json"),
      ...Object.entries(foundFolders)
        .filter(([_folder, wasFound]) => wasFound)
        .map(([folder]) => folder)
        .map((folder) => path.join(projectDir, folder)),
    ],
  }
}
