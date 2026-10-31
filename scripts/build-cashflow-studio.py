#!/usr/bin/env python3
"""Build an original, offline PrismBay cash-flow workbook using Python stdlib only.
No payments, publication, external network, personal data, or third-party assets.
"""
import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path
import zipfile
from xml.sax.saxutils import escape

SHEET_NAMES = ["Dashboard", "Monthly Cashflow", "Transactions", "Start Here", "Example Records"]
NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG = "http://schemas.openxmlformats.org/package/2006/relationships"

def x(s):
    return escape(str(s), {'"': '&quot;'})

def col(n):
    name = ""
    while n:
        n, r = divmod(n - 1, 26)
        name = chr(65 + r) + name
    return name

def excel_date(d):
    return (d - dt.date(1899, 12, 30)).days

class Sheet:
    def __init__(self, name, widths, freeze=None):
        self.name, self.widths, self.freeze = name, widths, freeze
        self.cells = {}
        self.maxrow = self.maxcol = 1
        self.validations = []
    def add(self, r, c, value="", style=0, formula=None):
        self.maxrow, self.maxcol = max(self.maxrow, r), max(self.maxcol, c)
        ref = col(c) + str(r)
        if formula is not None:
            xml = f'<c r="{ref}" s="{style}"><f>{x(formula.lstrip("="))}</f><v>0</v></c>'
        elif isinstance(value, (int, float)):
            xml = f'<c r="{ref}" s="{style}"><v>{value}</v></c>'
        elif value is None or value == "":
            xml = f'<c r="{ref}" s="{style}"/>'
        else:
            xml = f'<c r="{ref}" s="{style}" t="inlineStr"><is><t xml:space="preserve">{x(value)}</t></is></c>'
        self.cells[(r, c)] = xml
    def line(self, r, vals, style=0):
        for c, val in enumerate(vals, 1):
            self.add(r, c, val, style)
    def xml(self):
        widths = "".join(f'<col min="{c}" max="{c}" width="{w}" customWidth="1"/>' for c, w in enumerate(self.widths, 1))
        freeze = f'<sheetViews><sheetView workbookViewId="0"><pane ySplit="{self.freeze}" topLeftCell="A{self.freeze + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' if self.freeze else '<sheetViews><sheetView workbookViewId="0"/></sheetViews>'
        rows = {}
        for (r, c), cell in self.cells.items():
            rows.setdefault(r, []).append((c, cell))
        data = "".join(f'<row r="{r}">'+ "".join(cell for _, cell in sorted(rows[r])) +'</row>' for r in sorted(rows))
        checks = ""
        if self.validations:
            checks = f'<dataValidations count="{len(self.validations)}">'
            for rng, options in self.validations:
                checks += f'<dataValidation type="list" allowBlank="1" showErrorMessage="1" error="Choose an option in the dropdown." sqref="{rng}"><formula1>"{x(options)}"</formula1></dataValidation>'
            checks += '</dataValidations>'
        return f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="{NS}"><dimension ref="A1:{col(self.maxcol)}{self.maxrow}"/>{freeze}<sheetFormatPr defaultRowHeight="19"/><cols>{widths}</cols><sheetData>{data}</sheetData>{checks}<pageMargins left=".5" right=".5" top=".6" bottom=".6" header=".3" footer=".3"/></worksheet>'

def styles():
    fonts = '<fonts count="5">' + ''.join([
        '<font><sz val="11"/><name val="Aptos"/></font>',
        '<font><b/><sz val="12"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font>',
        '<font><sz val="11"/><color rgb="FF0000FF"/><name val="Aptos"/></font>',
        '<font><sz val="11"/><color rgb="FF008000"/><name val="Aptos"/></font>',
        '<font><b/><sz val="13"/><color rgb="FF12343B"/><name val="Aptos"/></font>'
    ]) + '</fonts>'
    fills = '<fills count="6">' + ''.join([
        '<fill><patternFill patternType="none"/></fill>',
        '<fill><patternFill patternType="gray125"/></fill>',
        '<fill><patternFill patternType="solid"><fgColor rgb="FF12343B"/><bgColor indexed="64"/></patternFill></fill>',
        '<fill><patternFill patternType="solid"><fgColor rgb="FF137B70"/><bgColor indexed="64"/></patternFill></fill>',
        '<fill><patternFill patternType="solid"><fgColor rgb="FFE9F3F0"/><bgColor indexed="64"/></patternFill></fill>',
        '<fill><patternFill patternType="solid"><fgColor rgb="FFF3F8FF"/><bgColor indexed="64"/></patternFill></fill>',
    ]) + '</fills>'
    fmt = '<numFmts count="2"><numFmt numFmtId="164" formatCode="$#,##0.00;[Red]($#,##0.00);&quot;-&quot;"/><numFmt numFmtId="165" formatCode="mmm yyyy"/></numFmts>'
    specs = [(0,0,0), (1,2,0), (1,3,0), (2,5,0), (3,4,164), (2,5,164), (2,5,14), (3,4,165), (0,4,0), (3,4,0), (2,5,0), (4,4,0), (4,4,164)]
    xfs = '<cellXfs count="%s">' % len(specs)
    for font, fill, num in specs:
        xfs += f'<xf numFmtId="{num}" fontId="{font}" fillId="{fill}" borderId="0" xfId="0" applyFont="1" applyFill="1" applyNumberFormat="1"/>'
    xfs += '</cellXfs>'
    return f'<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="{NS}">{fmt}{fonts}{fills}<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>{xfs}<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'

def build_sheets():
    dash = Sheet("Dashboard", [20,19,22,20,21,19,20,18], 3)
    for c in range(1,9):dash.add(1,c, "PRISMBAY  |  CASHFLOW CONTROL CENTER" if c == 1 else "", 1)
    dash.add(3,1,"Selected year",11);dash.add(3,3,style=9,formula="'Start Here'!B5")
    labels = [(5,1,"Total money in","'Monthly Cashflow'!B18"),(5,5,"Total money out","'Monthly Cashflow'!C18"),(8,1,"Net cash movement","'Monthly Cashflow'!D18"),(8,5,"Year-end cash","'Monthly Cashflow'!E18")]
    for r,c,label,form in labels:
        dash.add(r,c,label,11);dash.add(r,c+2,style=12,formula=form)
    dash.line(12,["MONTH","INCOME (USD)","EXPENSES (USD)","NET CHANGE (USD)","CLOSING CASH (USD)"],2)
    for r in range(13,25):
        m = r-8
        for c, ref in enumerate(["A","B","C","D","E"],1):
            dash.add(r,c,style=7 if c == 1 else 4,formula=f"'Monthly Cashflow'!{ref}{m}")
    dash.add(27,1,"Blue cells: inputs. Green: formulas. Examples are fictional.",8)
    monthly = Sheet("Monthly Cashflow", [22,21,22,23,25,20], 4)
    monthly.add(1,1,"MONTHLY CASHFLOW | SELECTED YEAR",1)
    monthly.line(4,["Month","Income (USD)","Expenses (USD)","Net change (USD)","Closing cash (USD)","Status"],2)
    for r in range(5,17):
        m = r-4
        monthly.add(r,1,style=7,formula=f"DATE('Start Here'!$B$5,{m},1)")
        for c,typ in [(2,"Income"),(3,"Expense")]:
            formula=f'SUMIFS(Transactions!$E$7:$E$306,Transactions!$B$7:$B$306,"{typ}",Transactions!$A$7:$A$306,">="&A{r},Transactions!$A$7:$A$306,"<"&EDATE(A{r},1))'
            monthly.add(r,c,style=4,formula=formula)
        monthly.add(r,4,style=4,formula=f"B{r}-C{r}")
        monthly.add(r,5,style=4,formula=f"'Start Here'!$B$6+SUM($D$5:D{r})")
        monthly.add(r,6,style=9,formula=f'IF(E{r}<0,"Cash shortfall","On track")')
    monthly.add(18,1,"YEAR TOTAL / END",11)
    for c in range(2,5):monthly.add(18,c,style=12,formula=f"SUM({col(c)}5:{col(c)}16)")
    monthly.add(18,5,style=12,formula="E16")
    tx = Sheet("Transactions", [17,16,22,36,19,21,22,29], 6)
    tx.add(1,1,"TRANSACTIONS | EDIT BLUE CELLS, USE POSITIVE AMOUNTS",1)
    tx.add(3,1,"Start on row 7. Type = Income or Expense. Blank rows are ignored.",8)
    tx.line(6,["Date","Type","Category","Description","Amount (USD)","Month (calculated)","Signed cash (USD)","Notes"],2)
    for r in range(7,307):
        for c in [1,2,3,4,5,8]:tx.add(r,c,style=6 if c==1 else 5 if c==5 else 3)
        tx.add(r,6,style=7,formula=f'IF(A{r}="","",DATE(YEAR(A{r}),MONTH(A{r}),1))')
        tx.add(r,7,style=4,formula=f'IF(OR(A{r}="",B{r}="",E{r}=""),"",IF(B{r}="Income",E{r},-E{r}))')
    tx.validations.append(("B7:B306","Income,Expense"))
    tx.validations.append(("C7:C306","Sales,Services,Other income,Rent,Utilities,Payroll,Supplies,Marketing,Software,Travel,Taxes,Other expense"))
    start = Sheet("Start Here", [36,58,17,16,16,15])
    start.add(1,1,"PRISMBAY | SMALL BUSINESS CASHFLOW STUDIO",1)
    start.add(4,1,"INPUTS (BLUE)",2)
    start.add(5,1,"Reporting year",11);start.add(5,2,2026,10)
    start.add(6,1,"Opening cash balance (USD)",11);start.add(6,2,0,5)
    start.add(8,1,"HOW TO USE",2)
    steps = [
       "01  Save an original copy before entering data.",
       "02  Enter transactions on the blue cells of Transactions.",
       "03  Select Income or Expense and a category from the lists.",
       "04  Enter amounts as positive numbers. Enter dates as real dates.",
       "05  Monthly Cashflow and Dashboard recalculate automatically.",
       "06  Example Records are fictional, not included in your totals.",
       "07  Do not enter passwords, card details or personal identifiers.",
       "08  Review with your accountant before making consequential decisions.",
    ]
    for r,v in enumerate(steps,9):start.add(r,2,v,8)
    start.add(19,1,"Planning template, not accounting, tax, or financial advice.",8)
    ex = Sheet("Example Records", [19,18,22,40,20])
    ex.add(1,1,"FICTIONAL EXAMPLES ONLY | NOT INCLUDED IN RESULTS",1)
    ex.line(4,["Date","Type","Category","Description","Amount (USD)"],2)
    records = [
      ("2026-01-05","Income","Services","Example consulting receipt",3200),
      ("2026-01-08","Expense","Rent","Example monthly rent",850),
      ("2026-01-12","Expense","Software","Example software",120),
      ("2026-02-04","Income","Sales","Example retail receipts",1950),
      ("2026-02-09","Expense","Marketing","Example promotion cost",325),
      ("2026-03-11","Expense","Payroll","Example contract labor",500)
    ]
    for r,(date,typ,cat,desc,val) in enumerate(records,5):
        ex.add(r,1,excel_date(dt.date.fromisoformat(date)),6)
        ex.add(r,2,typ);ex.add(r,3,cat);ex.add(r,4,desc);ex.add(r,5,val,5)
    return [dash,monthly,tx,start,ex]

def package(out):
    out = Path(out)
    out.mkdir(parents=True,exist_ok=True)
    workbook = out/"PrismBay_Cashflow_Studio_v1.xlsx"
    sheets = build_sheets()
    with zipfile.ZipFile(workbook, "w",zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        z.writestr("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + ''.join(f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i in range(1,6)) + '</Types>')
        z.writestr("_rels/.rels", f'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="{PKG}"><Relationship Id="rId1" Type="{REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>')
        z.writestr("xl/workbook.xml", f'<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="{NS}" xmlns:r="{REL}"><sheets>' + ''.join(f'<sheet name="{x(s.name)}" sheetId="{i}" r:id="rId{i}"/>' for i,s in enumerate(sheets,1)) + '</sheets><calcPr calcId="191029" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>')
        z.writestr("xl/_rels/workbook.xml.rels", f'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="{PKG}">' + ''.join(f'<Relationship Id="rId{i}" Type="{REL}/worksheet" Target="worksheets/sheet{i}.xml"/>' for i in range(1,6)) + f'<Relationship Id="rId6" Type="{REL}/styles" Target="styles.xml"/></Relationships>')
        z.writestr("xl/styles.xml", styles())
        for i,s in enumerate(sheets,1):z.writestr(f"xl/worksheets/sheet{i}.xml",s.xml())
    guide=out/"START_HERE.txt"
    guide.write_text("PRISMBAY CASHFLOW STUDIO v1\n\nIncludes a 12-month dashboard, monthly summary, 300 transaction entry rows, category dropdowns and fictional sample records.\n\n1. Open Start Here and choose reporting year and opening cash.\n2. In Transactions, fill the blue input cells: actual date, Income/Expense, category, description and a POSITIVE USD amount.\n3. Dashboard and Monthly Cashflow calculate automatically; examples are separate and do not affect totals.\n4. This is internal planning software, not a bank reconciliation, invoice system, accounting/tax service, or a profitability guarantee.\n\nExcel or compatible spreadsheet software is required. Some viewers recalculate formulas only when opening the file. Keep backups.\nSupport: https://www.prismbayai.com/contact\nRefund policy: https://www.prismbayai.com/refunds\n", encoding="utf-8")
    license=out/"LICENSE.txt"
    license.write_text("PrismBay Cashflow Studio v1 | Original PrismBay document system\nIntended buyer license: personal or internal use by one purchaser and their own organization. You may enter and retain your own records, adapt layout for your use, and create internal copies. You may not resell, distribute, sublicense, or share the blank template as a commercial product.\nThe workbook is provided as a planning aid without accounting, legal, tax, banking or financial advice, certification or guaranteed results.\n", encoding="utf-8")
    archive=out/"PrismBay_Cashflow_Studio_v1.zip"
    with zipfile.ZipFile(archive,"w",zipfile.ZIP_DEFLATED) as z:
        for f in [workbook,guide,license]:z.write(f,f.name)
    digest=hashlib.sha256(archive.read_bytes()).hexdigest()
    metadata={"sku":"cashflow-studio-v1","priceUsdProposed":5.99,"status":"review_only_not_for_sale","contents":[f.name for f in [workbook,guide,license]],"archiveSha256":digest,"paidDeliveryVerified":False,"publicDownloadAllowed":False}
    (out/"manifest.json").write_text(json.dumps(metadata,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"archive":str(archive),"sha256":digest,"bytes":archive.stat().st_size,"status":metadata["status"]}))
    return archive

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--out",default="growth-reports/digital-prototypes/cashflow-studio")
    args=parser.parse_args()
    package(args.out)
