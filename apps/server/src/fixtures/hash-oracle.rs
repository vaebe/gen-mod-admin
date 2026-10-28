use sha2::{Digest, Sha256};
use std::{collections::BTreeMap, fs, path::{Path, PathBuf}};
fn walk(root: &Path, dir: &Path, files: &mut BTreeMap<String, PathBuf>) {
    for entry in fs::read_dir(dir).unwrap() {
        let path = entry.unwrap().path();
        if path.is_dir() { walk(root, &path, files); }
        else { files.insert(path.strip_prefix(root).unwrap().to_string_lossy().replace('\\', "/"), path); }
    }
}
fn main() {
    let root = PathBuf::from(std::env::args().nth(1).unwrap());
    let mut files = BTreeMap::new(); walk(&root, &root, &mut files);
    let mut hash = Sha256::new();
    // 与桌面 registry.rs 的 serde_json::json! 和文件字节协议一致。
    hash.update(serde_json::to_vec(&serde_json::json!({
        "category": "common", "gameId": null, "version": "2.1.0", "dependencies": [],
        "excludePaths": [".delivery", "build"], "requiredCommandScripts": [], "inspectionFile": null
    })).unwrap());
    for (relative, path) in files {
        hash.update(relative.as_bytes()); hash.update([0]);
        hash.update(format!("{:x}", Sha256::digest(fs::read(path).unwrap())).as_bytes()); hash.update([0]);
    }
    println!("{:x}", hash.finalize());
}
