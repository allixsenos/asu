const amount = (value) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
const yesNo = (value) => value === null ? 'unknown' : value ? 'yes' : 'no';
function windowValue(window) {
    if (window.unlimited)
        return 'Unlimited';
    const parts = [window.percentUsed === null ? 'Usage unknown' : `${amount(window.percentUsed)}% used`];
    if (window.used !== undefined)
        parts.push(`${amount(window.used)}${window.limit === undefined ? '' : ` / ${amount(window.limit)}`}${window.unit ? ` ${window.unit}` : ''}`);
    else if (window.limit !== undefined)
        parts.push(`limit ${amount(window.limit)}${window.unit ? ` ${window.unit}` : ''}`);
    return parts.join('; ');
}
function balanceValue(balance) {
    if (balance.unlimited)
        return 'Unlimited';
    const parts = [];
    if (balance.remaining !== undefined)
        parts.push(`${amount(balance.remaining)} ${balance.unit} left`);
    if (balance.used !== undefined)
        parts.push(`${amount(balance.used)} ${balance.unit} used`);
    if (balance.limit !== undefined)
        parts.push(`limit ${amount(balance.limit)} ${balance.unit}`);
    return parts.join('; ') || 'Balance unknown';
}
function providerSummary(provider) {
    return `installed: ${yesNo(provider.installed)}, authenticated: ${yesNo(provider.authenticated)}`;
}
export function renderPlain(report) {
    const lines = [`ASU · ${report.generatedAt}`];
    for (const provider of report.providers) {
        lines.push('', `${provider.displayName} (${provider.providerId})${provider.experimental ? ' [experimental]' : ''}`, `  ${provider.availability}; ${providerSummary(provider)}`);
        if (provider.planLabel)
            lines.push(`  Plan: ${provider.planLabel}`);
        for (const window of provider.windows)
            lines.push(`  ${window.label}: ${windowValue(window)}; resets ${window.resetsAt ?? 'unknown'}`);
        for (const balance of provider.balances)
            lines.push(`  ${balance.label}: ${balanceValue(balance)}`);
        for (const detail of provider.details)
            lines.push(`  ${detail.label}: ${detail.value}`);
        if (provider.reason)
            lines.push(`  ${provider.reason.code}: ${provider.reason.message}`);
        lines.push(`  Fetched ${provider.fetchedAt}; ${provider.cached ? 'cached' : 'fresh'}; expires ${provider.expiresAt}`);
    }
    if (!report.providers.length)
        lines.push('', 'No supported agents or credentials detected. Use --all to list every provider.');
    for (const warning of report.warnings)
        lines.push('', `Warning: ${warning}`);
    return lines.join('\n') + '\n';
}
// Cell wrapping preserves long labels, including CJK characters, without terminal escape sequences.
const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
function width(character) {
    const cp = character.codePointAt(0) ?? 0;
    return /\p{Extended_Pictographic}/u.test(character) || cp >= 0x1100 && (cp <= 0x115f || cp >= 0x2329 && cp <= 0x232a || cp >= 0x2e80 && cp <= 0xa4cf
        || cp >= 0xac00 && cp <= 0xd7a3 || cp >= 0xf900 && cp <= 0xfaff
        || cp >= 0xfe10 && cp <= 0xfe6f || cp >= 0xff00 && cp <= 0xff60
        || cp >= 0xffe0 && cp <= 0xffe6 || cp >= 0x20000 && cp <= 0x3fffd) ? 2 : 1;
}
function textWidth(text) { return [...segmenter.segment(text)].reduce((sum, item) => sum + width(item.segment), 0); }
function wrap(text, columns) {
    const lines = [];
    for (const paragraph of text.split('\n')) {
        let line = '', length = 0;
        for (const { segment } of segmenter.segment(paragraph)) {
            const size = width(segment);
            if (length + size > columns) {
                lines.push(line);
                line = '';
                length = 0;
            }
            line += segment;
            length += size;
        }
        lines.push(line);
    }
    return lines;
}
export function renderTable(report, columns = 110) {
    const widths = [16, 18, 25, 24, 18];
    const target = Math.max(60, Math.min(180, columns));
    const minima = [8, 9, 10, 10, 7];
    while (widths.reduce((sum, value) => sum + value, 16) > target) {
        let index = -1;
        for (let i = 0; i < widths.length; i++)
            if (widths[i] > minima[i] && (index < 0 || widths[i] > widths[index]))
                index = i;
        if (index < 0)
            break;
        widths[index] = widths[index] - 1;
    }
    const border = (left, middle, right) => left + widths.map(w => '─'.repeat(w + 2)).join(middle) + right;
    const lines = [`ASU · ${report.generatedAt}`, border('┌', '┬', '┐')];
    function row(cells) {
        const wrapped = cells.map((cell, i) => wrap(cell, widths[i]));
        const height = Math.max(...wrapped.map(cell => cell.length));
        for (let line = 0; line < height; line++)
            lines.push('│ ' + wrapped.map((cell, i) => {
                const value = cell[line] ?? '';
                return value + ' '.repeat(widths[i] - textWidth(value));
            }).join(' │ ') + ' │');
    }
    row(['Provider', 'Plan / status', 'Window / balance', 'Usage', 'Resets (UTC)']);
    for (const provider of report.providers) {
        lines.push(border('├', '┼', '┤'));
        const rows = provider.windows.map(window => [window.label, windowValue(window).replaceAll('; ', '\n'),
            window.resetsAt ? window.resetsAt.replace('T', ' ').slice(0, 16) : 'Unknown']);
        rows.push(...provider.balances.map(balance => [balance.label, balanceValue(balance).replaceAll('; ', '\n'), '—']));
        if (!rows.length)
            rows.push(['—', '—', '—']);
        rows.forEach((cells, index) => row([index ? '' : provider.displayName + (provider.experimental ? ' *' : ''),
            index ? '' : [provider.planLabel, provider.availability, provider.cached ? 'cached' : 'fresh'].filter(Boolean).join('\n'), ...cells]));
    }
    lines.push(border('└', '┴', '┘'));
    if (!report.providers.length)
        lines.push('No supported agents or credentials detected. Use --all to list every provider.');
    for (const provider of report.providers) {
        lines.push(`${provider.displayName}: ${providerSummary(provider)}. Fetched ${provider.fetchedAt}; cache expires ${provider.expiresAt}.`);
        if (provider.reason)
            lines.push(`  ${provider.reason.code}: ${provider.reason.message}`);
        for (const detail of provider.details)
            lines.push(`  ${detail.label}: ${detail.value}`);
    }
    if (report.providers.some(p => p.experimental))
        lines.push('* Experimental adapter: fixture-tested, not verified against a live subscription.');
    for (const warning of report.warnings)
        lines.push(`Warning: ${warning}`);
    return lines.join('\n') + '\n';
}
export function render(report, format, columns) {
    return format === 'json' ? JSON.stringify(report, null, 2) + '\n' : format === 'table' ? renderTable(report, columns) : renderPlain(report);
}
//# sourceMappingURL=output.js.map