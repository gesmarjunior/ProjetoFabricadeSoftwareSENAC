import {
  access,
  copyFile,
  cp,
  lstat,
  mkdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "_site");
const apps = ["fiscaliza-lixo-ia", "radar-dengue-inteligente"];

// Confere os builds antes de substituir somente a pasta gerada deste repositório.
await access(join(root, "deployment", "index.html"));
for (const app of apps) await access(join(root, app, "dist", "index.html"));
const previous = await lstat(output).catch((error) => {
  if (error.code === "ENOENT") return null;
  throw error;
});
if (relative(root, output) !== "_site" || previous?.isSymbolicLink()) {
  throw new Error("Destino de publicação inválido.");
}
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await copyFile(
  join(root, "deployment", "index.html"),
  join(output, "index.html"),
);
await writeFile(join(output, ".nojekyll"), "");
for (const app of apps) {
  await cp(join(root, app, "dist"), join(output, app), { recursive: true });
}
console.log(
  "Publicação preparada: página inicial e dois aplicativos em _site/.",
);
