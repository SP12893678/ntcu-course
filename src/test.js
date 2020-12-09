const puppeteer = require('puppeteer')
const express = require('express')
const { resolve } = require('path')
const { rejects } = require('assert')
const app = express()

app.use((req, res, next) => {
    res.append('Access-Control-Allow-Origin', '*')
    res.append('Access-Control-Allow-Credentials', 'true')
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    res.append('Access-Control-Allow-Headers', 'DNT,X-Mx-ReqToken,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization')
    next()
})

app.get('/course', async function (req, res) {
    // const courseData = await getCourse()
    // res.send(courseData)
})

app.get('/ddlEdu', async function (req, res) {
    const txtYears = ['108', '109']
    const txtTerm = ['第一學期', '第二學期']
    const fs = require('fs')
    const ddlEdu = JSON.parse(fs.readFileSync('test.json', 'utf-8'))
    const data = {
        txtYears, txtTerm, ddlEdu
    }
    res.send(data)
})

app.listen(3000, function () {
    console.log('Example app listening on port 3000!')
});

(async () => {
    // const courseData = await getCourse()
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        headless: false
    })

    // getDdlEduData(browser)

    const txtYears = ['108', '109']
    const txtTerm = [
        { value: '0', text: '第一學期' },
        { value: '1', text: '第二學期' }
    ]
    const fs = require('fs')
    const ddlEdu = JSON.parse(fs.readFileSync('test.json', 'utf-8'))
    // console.log(ddlEdu)

    // txtYears.forEach(year => {
    //     txtTerm.forEach(term => {
    //         ddlEdu.forEach(item => {
    //             item.ddlDept.forEach((department, index) => {
    //                 data.push(getCourse1(browser, {
    //                     txtYears: year,
    //                     txtTerm: term,
    //                     ddlEdu: item,
    //                     ddlDeptIdx: index
    //                 }))
    //             })
    //         })
    //     })
    // })

    const data = []
    const getCourseData = new Promise((resolve, reject) => {
        ddlEdu[0].ddlDept.forEach((element, index) => {
            getCourse1(browser, {
                txtYears: txtYears[0],
                txtTerm: txtTerm[0],
                ddlEdu: ddlEdu[0],
                ddlDeptIdx: index
            }).then(res => {
                data.push(res)
                if (data.length == ddlEdu[0].ddlDept.length) resolve(true)
            })
        })
    })

    getCourseData.then(res => {
        const fs = require('fs')

        fs.writeFile('course.json', JSON.stringify(data), function (err) {
            if (err) { console.log(err) } else { console.log('Write operation complete.') }
        })
    })

    // console.log(result)
})()

async function getCourse1 (browser, { txtYears, txtTerm, ddlEdu, ddlDeptIdx }) {
    const page = await browser.newPage()
    await page.goto('https://ecs.ntcu.edu.tw/pub/TchSchedule_Search.aspx')

    await page.waitForSelector('select[name = "txtTerm"]')
    await page.waitForSelector('select[name = "ddlEdu"]')

    await page.type('input[name = "txtYears"]', txtYears)
    await page.select('select[name = "txtTerm"]', txtTerm.value)
    await page.select('select[name = "ddlEdu"]', ddlEdu.value)
    const selector = 'select[name = "ddlDept"]'
    await page.waitForFunction(selector => document.querySelector(selector).selectedIndex != -1, {}, selector)
    await page.select('select[name = "ddlDept"]', ddlEdu.ddlDept[ddlDeptIdx].value)
    const selector2 = 'select[name = "ddlClass"]'
    await page.waitForFunction(selector => document.querySelector(selector).selectedIndex != -1, {}, selector2)

    await page.click('input[name = "btnSearch"]')
    await page.waitForSelector('table[id = "dsCurList"]')

    let data = await page.evaluate(
        () => Array.from(
            document.querySelectorAll('table[id="dsCurList"] > tbody > tr'),
            row => Array.from(row.querySelectorAll('th, td'), cell => cell.innerText.replace(/[\n\t]/g, ''))
        )
    )
    page.close()

    /** 去除標格標題和全部敘述 */
    data.splice(0, 1)
    data = data.map(item => item.splice(1))

    const { value, text } = ddlEdu.ddlDept[ddlDeptIdx]
    const obj = {
        txtYears,
        txtTerm,
        ddlEdu: { value: ddlEdu.value, text: ddlEdu.text },
        ddlDept: { value, text },
        data
    }
    // return obj
    return new Promise((resolve, reject) => {
        resolve(obj)
    })
}

async function getDdlEduData (browser) {
    const page = await browser.newPage()
    await page.goto('https://ecs.ntcu.edu.tw/pub/TchSchedule_Search.aspx')

    await page.waitForSelector('select[name = "ddlEdu"]')

    const options = await page.$eval('select[name = "ddlEdu"]', async (selector) => {
        const names = []
        for (const element of document.querySelector('select[name = "ddlEdu"]').children) {
            const obj = {}
            obj.value = element.value
            obj.text = element.textContent
            names.push(obj)
        }
        names.splice(0, 1)
        return names
    })

    for (let index = 0; index < options.length; index++) {
        await page.select('select[name = "ddlEdu"]', options[index].value)
        const selector = 'select[name = "ddlDept"]'
        await page.waitForFunction((selector, index) => document.querySelector(selector).selectedIndex != -1, {}, selector, index)

        const ddlDept = await page.$eval('select[name = "ddlDept"]', async (selector) => {
            const names = []
            for (const element of document.querySelector('select[name = "ddlDept"]').children) {
                if (element.value != -1) {
                    const obj = {}
                    obj.value = element.value
                    obj.text = element.textContent
                    names.push(obj)
                }
            }
            return names
        })

        for (let index = 0; index < ddlDept.length; index++) {
            await page.select('select[name = "ddlDept"]', ddlDept[index].value)
            const selector = 'select[name = "ddlClass"]'
            await page.waitForFunction((selector, index) => document.querySelector(selector).selectedIndex != -1, {}, selector, index)

            const ddlClass = await page.$eval('select[name = "ddlClass"]', async (selector) => {
                const names = []
                for (const element of document.querySelector('select[name = "ddlClass"]').children) {
                    if (element.value != -1) {
                        const obj = {}
                        obj.value = element.value
                        obj.text = element.textContent
                        names.push(obj)
                    }
                }
                return names
            })
            await page.select('select[name = "ddlClass"]', '')
            ddlDept[index].ddlClass = ddlClass
        }

        await page.select('select[name = "ddlDept"]', '')
        options[index].ddlDept = ddlDept
    }

    console.log(options)

    const fs = require('fs')

    fs.writeFile('test.json', JSON.stringify(options), function (err) {
        if (err) { console.log(err) } else { console.log('Write operation complete.') }
    })
}

async function getCourse () {
    const browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        headless: false
    })
    const page = await browser.newPage()
    await page.goto('https://ecs.ntcu.edu.tw/pub/TchSchedule_Search.aspx')
    await page.waitForSelector('select[name = "ddlEdu"]')

    const options = await page.$eval('select[name = "ddlEdu"]', selector => {
        const names = []
        for (const element of document.querySelector('select[name = "ddlEdu"]').children) {
            names.push(element.value)
        }
        return names
    })

    await page.select('select[name = "ddlEdu"]', options[1])
    const selector = 'select[name = "ddlDept"]'
    await page.waitForFunction(selector => document.querySelector(selector).selectedIndex != -1, {}, selector)
    await page.select('select[name = "ddlDept"]', 'ACS')
    const selector2 = 'select[name = "ddlClass"]'
    await page.waitForFunction(selector => document.querySelector(selector).selectedIndex != -1, {}, selector2)

    await page.click('input[name = "btnSearch"]')
    await page.waitForSelector('table[id = "dsCurList"]')

    const data = await page.evaluate(
        () => Array.from(
            document.querySelectorAll('table[id="dsCurList"] > tbody > tr'),
            row => Array.from(row.querySelectorAll('th, td'), cell => cell.innerText.replace(/[\n\t]/g, ''))
        )
    )

    await browser.close()

    return data
}
