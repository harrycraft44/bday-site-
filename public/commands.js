export function getCompletions(partial) {
    if (partial.includes(' ')) {
        const parts = partial.split(/\s+/);
        let arg = parts[parts.length - 1];
        let dir = '/';
        if (arg.includes('/')) dir = arg.slice(0, arg.lastIndexOf('/') + 1);
        const node = getNode(dir);
        if (!node || node.type !== 'dir') return [];
        return Object.keys(node.children).filter(name => name.startsWith(arg.replace(/^.*\//, ''))).map(name => dir + name);
    } else {
        return Object.keys(commands).filter(cmd => cmd.startsWith(partial));
    }
}

const fs = {
    '/': {
        type: 'dir',
        children: {
            'home': {
                type: 'dir',
                children: {
                    'user.txt': { type: 'file', content: 'MEOW' },
                    'birthday-wishlist.txt': { type: 'file', content: '1. Raspberry Pi\n2. just random tech stuff\n3. money\n4. FRAMEWORK LAPTOP. i have 3 dead laptops all cheap found on the side of the road.' },
                    'welcome.txt': { type: 'file', content: 'WELLCOMEEE!\nHAVE FUNNNN.\nType `help` to see available commands.' }
                }
            },
            'cake.txt': { type: 'file', content: 'Chocolate cake recipe' }
        }
    }
};
let cwd = '/';

function resolvePath(path) {
    if (!path || path === '.') return cwd;
    const absolute = path[0] === '/';
    const parts = path.split('/').filter(Boolean);
    const stack = absolute ? [] : cwd.split('/').filter(Boolean);
    for (const part of parts) {
        if (part === '.' || part === '') continue;
        if (part === '..') {
            if (stack.length > 0) stack.pop();
        } else {
            stack.push(part);
        }
    }
    const resolved = '/' + stack.join('/');
    return resolved === '' ? '/' : resolved;
}

function getNode(path) {
    const parts = path.split('/').filter(Boolean);
    let node = fs['/'];
    for (const part of parts) {
        if (!node.children || !node.children[part]) return null;
        node = node.children[part];
    }
    return node;
}

function listDir(path) {
    const node = getNode(path);
    if (!node || node.type !== 'dir') return 'Not a directory';
    return Object.keys(node.children).join('  ');
}

function makeFile(path, content = '') {
    const parts = path.split('/').filter(Boolean);
    const fname = parts.pop();
    let node = fs['/'];
    for (const part of parts) {
        if (!node.children[part]) node.children[part] = { type: 'dir', children: {} };
        node = node.children[part];
    }
    node.children[fname] = { type: 'file', content };
}

function writeFile(path, content) {
    const node = getNode(path);
    if (node && node.type === 'file') node.content = content;
    else makeFile(path, content);
}

function readFile(path) {
    const node = getNode(path);
    if (node && node.type === 'file') return node.content;
    return '';
}

function deleteNode(path, recursive = false) {
    const parts = path.split('/').filter(Boolean);
    const name = parts.pop();
    let node = fs['/'];
    for (const part of parts) {
        if (!node.children || !node.children[part]) return { ok: false, err: 'No such file or directory' };
        node = node.children[part];
        if (node.type !== 'dir') return { ok: false, err: 'Not a directory' };
    }
    if (!node.children || !node.children[name]) return { ok: false, err: 'No such file or directory' };
    const target = node.children[name];
    if (target.type === 'dir') {
        const isEmpty = Object.keys(target.children).length === 0;
        if (!isEmpty && !recursive) return { ok: false, err: 'Directory not empty' };
        if (recursive) {
            (function deleteRec(n) {
                if (n.type === 'dir') {
                    for (const k of Object.keys(n.children)) {
                        deleteRec(n.children[k]);
                    }
                }
            })(target);
        }
    }
    delete node.children[name];
    return { ok: true };
}

const commands = {
    neofetch: {
        description: 'Display Birthday OS info and ASCII art',
        run: () => {
            const art = [
                '             ,   ,   ,   ,',
                '           , |_,_|_,_|_,_| ,',
                '       _,-=|;  |,  |,  |,  |;=-_',
                '     .-_| , | , | , | , | , |  _-.',
                '     |:  -|:._|___|___|__.|:=-  :|',
                '     ||*:  :    .     .    :  |*||',
                '     || |  | *  |  *  |  * |  | ||',
                ' =_      -=:.___:_____|___.: =-     _=',
                '    - . _ __ ___  ___  ___ __ _ . -',
                '',
                '   Birthday OS (Bootloader Edition)'
            ];
            const info = [
                '',
                `user@birthday-os`,
                '--------------------------',
                `OS: Birthday OS v1.0`,
                `Host: Browser (${navigator.userAgent.split(')')[0]})`,
                `Uptime: ~${Math.floor(performance.now()/1000)}s`,
                `Shell: birthday-terminal`,
                `Birthday: November 8, 2025`,
                '',
                'Type help to see available commands.'
            ];
            return art.concat(info).join('\n');
        }
    },
    clear: {
        description: 'Clear the terminal screen',
        run: () => {
            if (typeof window !== 'undefined') {
                const seq = document.getElementById('boot-seq');
                if (seq) seq.innerHTML = '';
            }
            return '';
        }
    },
    countdown: {
        description: 'Show how many days until your birthday',
        run: () => {
            const today = new Date();
            let nextBirthday = new Date(today.getFullYear(), 10, 8); 
            if (
                today.getMonth() > 10 ||
                (today.getMonth() === 10 && today.getDate() > 8)
            ) {
                nextBirthday = new Date(today.getFullYear() + 1, 10, 8);
            }
            const msPerDay = 1000 * 60 * 60 * 24;
            const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const diff = Math.ceil((nextBirthday - todayMid) / msPerDay);
            if (diff === 0) {
                return "Happy Birthday! It's today!";
            } else if (diff === 1) {
                return "Your birthday is tomorrow! (1 day left)";
            } else {
                return `There are ${diff} days until my birthday (November 8).`;
            }
        }
    },
    mkdir: {
        description: 'Create a new directory (usage: mkdir dirname)',
        run: (args) => {
            if (!args[0]) return 'Usage: mkdir dirname';
            const path = resolvePath(args[0]);
            const parts = path.split('/').filter(Boolean);
            const dname = parts.pop();
            let node = fs['/'];
            for (const part of parts) {
                if (!node.children[part]) node.children[part] = { type: 'dir', children: {} };
                node = node.children[part];
                if (node.type !== 'dir') return 'Cannot create directory inside a file';
            }
            if (node.children[dname]) return 'Directory or file already exists: ' + args[0];
            node.children[dname] = { type: 'dir', children: {} };
            return '';
        }
    },
    rm: {
        description: 'Remove file or directory. Use -r to remove directories recursively (usage: rm [-r] path)',
        run: (args) => {
            if (!args[0]) return 'Usage: rm [-r] path';
            const recursive = args.includes('-r') || args.includes('--recursive');
            const targets = args.filter(a => a !== '-r' && a !== '--recursive');
            const results = [];
            for (const t of targets) {
                const path = resolvePath(t);
                const res = deleteNode(path, recursive);
                if (!res.ok) results.push(res.err + ': ' + t);
            }
            return results.length ? results.join('\n') : '';
        }
    },
    rmdir: {
        description: 'Remove an empty directory (usage: rmdir dirname)',
        run: (args) => {
            if (!args[0]) return 'Usage: rmdir dirname';
            const path = resolvePath(args[0]);
            const res = deleteNode(path, false);
            if (!res.ok) return res.err;
            return '';
        }
    },
    tree: {
        description: 'Display a tree of files and directories (usage: tree [path])',
        run: (args) => {
            const path = args[0] ? resolvePath(args[0]) : cwd;
            const node = getNode(path);
            if (!node || node.type !== 'dir') return 'Not a directory';
            const lines = [];
            const rootName = path === '/' ? '/' : path.split('/').filter(Boolean).pop();
            lines.push(rootName || '/');
            function traverse(n, prefix) {
                const keys = Object.keys(n.children).sort();
                keys.forEach((k, idx) => {
                    const child = n.children[k];
                    const isLast = idx === keys.length - 1;
                    const connector = isLast ? '└── ' : '├── ';
                    lines.push(prefix + connector + k + (child.type === 'dir' ? '/' : ''));
                    if (child.type === 'dir') {
                        const newPrefix = prefix + (isLast ? '    ' : '│   ');
                        traverse(child, newPrefix);
                    }
                });
            }
            traverse(node, '');
             return lines.join('\n');
         }
     },
    help: {
        description: 'Show detailed help for all commands',
        run: () => {
            const arr = [];
            for (const [name, cmd] of Object.entries(commands)) {
                arr.push(`${name}: ${cmd.description}`);
            }
            return arr.join('\n');
        }
    },
    echo: {
        description: 'Echo back input',
        run: (args) => args.join(' ')
    },
    ls: {
        description: 'List directory contents',
        run: (args) => {
            const path = args[0] ? resolvePath(args[0]) : cwd;
            return listDir(path);
        }
    },
    cd: {
        description: 'Change directory',
        run: (args) => {
            const path = args[0] ? resolvePath(args[0]) : '/';
            const node = getNode(path);
            if (node && node.type === 'dir') {
                cwd = path === '' ? '/' : path;
                return '';
            } else {
                return 'No such directory: ' + args[0];
            }
        }
    },
    pwd: {
        description: 'Print working directory',
        run: () => cwd
    },
    cat: {
        description: 'Show file contents',
        run: (args) => {
            if (!args[0]) return 'Usage: cat filename';
            const path = resolvePath(args[0]);
            const node = getNode(path);
            if (node && node.type === 'file') return node.content;
            return 'No such file: ' + args[0];
        }
    },
    nano: {
        description: 'Edit a file (usage: nano filename)',
        run: (args) => {
            if (!args[0]) return 'Usage: nano filename';
            const path = resolvePath(args[0]);
            window.dispatchEvent(new CustomEvent('nano-open', { detail: { filename: path, content: readFile(path) } }));
            return `Opening nano for ${path}...`;
        }
    },
    meow: {
        description: 'meow?!',
        run: () => {
            
            return 'meow meow meow meow meow meow meow meow meow meow meow meow meow meow meow';
        }
    },
    rick:{
        description: 'try it if you dare',
        run: () => {
           if(typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ascii-animate',{
                detail:{
                    url: './ascii-frames.json',
                    fps: 25,
                    look: false
                }

            }));
           }
           return "NEVER GONNA GIVE YOU UP"
        }
    },
    meow: {
        description: 'MEOW MEOW',
        run: () => {
           if(typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ascii-animate',{
                detail:{
                    url: './ascii-frames(2).json',
                    fps: 25,
                    look: false
                }

            }));
           }
           return "MEOWWWW IMA CAT"
        }
    },
};


export function handleCommand(input) {
    const [cmd, ...args] = input.trim().split(/\s+/);
    if (!cmd) return '';
    if (commands[cmd]) {
        return commands[cmd].run(args);
    } else {
        return `Command not found: ${cmd}`;
    }
}

export function getCommandList() {
    return Object.entries(commands).map(([name, obj]) => `${name}: ${obj.description}`).join('\n');
}

export function nanoSaveFile(filename, content) {
    writeFile(filename, content);
}
