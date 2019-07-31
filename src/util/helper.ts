
export const checkTag = value => {
    value = String(value).toLowerCase()
    if (/^(0x)[0-9a-f]{64}$/.test(value)) return value
    if (/^[0-9a-f]{64}$/.test(value)) return '0x' + value
    return null
}