import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";

import { AppComponent } from "./app.component";
import { LinechartComponent } from "./linechart/linechart.component";
import { CandlechartComponent } from "./candlechart/candlechart.component";
import { NgxChartsModule } from "@swimlane/ngx-charts";
import { NZ_I18N } from "ng-zorro-antd/i18n";
import { en_GB } from "ng-zorro-antd/i18n";
import { registerLocaleData } from "@angular/common";
import en from "@angular/common/locales/en";
import { FormsModule } from "@angular/forms";
import { HttpClientModule } from "@angular/common/http";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { IconsProviderModule } from "./icons-provider.module";
import { NzLayoutModule } from "ng-zorro-antd/layout";
import { NzMenuModule } from "ng-zorro-antd/menu";
import { NzDividerModule } from "ng-zorro-antd/divider";
import { NzGridModule } from "ng-zorro-antd/grid";
import { NzTimelineModule } from "ng-zorro-antd/timeline";
import { NzStatisticModule } from "ng-zorro-antd/statistic";

registerLocaleData(en);

const NzModules = [
  NzLayoutModule,
  NzMenuModule,
  NzDividerModule,
  NzGridModule,
  NzTimelineModule,
  NzStatisticModule,
];

@NgModule({
  declarations: [AppComponent, LinechartComponent, CandlechartComponent],
  imports: [
    BrowserModule,
    NgxChartsModule,
    FormsModule,
    HttpClientModule,
    BrowserAnimationsModule,
    IconsProviderModule,
    ...NzModules,
  ],
  providers: [{ provide: NZ_I18N, useValue: en_GB }],
  bootstrap: [AppComponent],
})
export class AppModule {}
