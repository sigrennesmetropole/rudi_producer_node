/**
 * Basic Media file descriptor
 *
 * @author: Laurent Morin
 * @version: 1.0.0
 */
const magic = require("magic-bytes.js");

/**
 * Extract mime data.
 * @function
 *
 */
function mimeFromContent(filecontent) {
    let mimetype = "application/octet-stream";
    const info = magic.filetypeinfo(filecontent);
    // this.syslog.debug('Filetype: '+ JSON.stringify(info, null, 4), this.logid);
    if (info.length) { // Take the 1st matching.
        if ("mime" in info[0]) mimetype = info[0].mime;
        else if ("typename" in info[0]) mimetype = "application/" + info[0].typename;
    }
    /* TODO: Clean-up json/csv analysis.
     *
     * For sure, the following code is full of "magic-values". The
     * purpose of this code is to provide a content basic analysis
     * for demos.
     */
    else if (Buffer.isBuffer(filecontent)) {
        const itecur = function (s, p) { let i=0, c=-1; while (i>=0&&c<10) { i=s.indexOf(p, i)+1; c++; }; return c; };

        const contheader = filecontent.slice(0, filecontent.indexOf("\n")).slice(0, 500);
        if (itecur(contheader, ";") > 3 || itecur(contheader, ",") > 3) { mimetype = "text/csv"; }
        let jsoncontent = "";
        if (filecontent.length < 5000) {
            try { jsoncontent = JSON.parse(filecontent); }
            catch (e) {}
        }
        else {
            const s = filecontent.slice(0, 500);
            jsoncontent = (itecur(s, "{") > 3 && itecur(s, "}") > 3 && itecur(s, ",") > 3) ? s : "";
        }
        if (jsoncontent.length > 0) {
            if (jsoncontent.includes("Feature") && jsoncontent.includes("geometry"))
                mimetype = "application/geo+json";
            else
                mimetype = "application/json";
        }
    }
    return mimetype;
}

/* eslint-disable no-multi-spaces, brace-style */
/**
 * Extract encoding.
 * @function
 *
 */
function charsetFromContent(filecontent) {
    /* TODO: Clean-up charset analysis.
     *
     * The following code is limited to small files. The purpose
     *  of this code is to provide a basic charset analysis for
     *  demos.
     */
    let charset = "";
    if (Buffer.isBuffer(filecontent) && filecontent.length < 120000) {
        if      (charset == "") try { filecontent.toString("base64"); charset = "charset=us-ascii"; } catch (e) {}
        else if (charset == "") try { filecontent.toString("utf8");   charset = "charset=utf-8"; }    catch (e) {}
        else if (charset == "") try { filecontent.toString("ascii");  charset = "charset=us-ascii"; } catch (e) {}
    }
    else charset = "charset=binary";
    return charset;
}
/* eslint-enable no-multi-spaces */

module.exports = { mimeFromContent:mimeFromContent, charsetFromContent:charsetFromContent };
