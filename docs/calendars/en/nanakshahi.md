---
title: The Nanakshahi (Sikh) calendar
label: Sikh (Nanakshahi)
summary: >-
  The solar calendar of Sikhism adopted in 2003: 12 months that always begin on the same days of the Gregorian calendar, a year beginning on 14 March and years counted from 1469, the year of Guru Nanak's birth. Its form is still debated among Sikh communities.
---

## Description

The Nanakshahi calendar has a solar year of the same length as the Gregorian year, with 12 months that always begin on the same day: Chet (14 March), Vaisakh (14 April), Jeth (15 May), Harh (15 June), Sawan (16 July), Bhadon (16 August), Assu (15 September), Katak (15 October), Maghar (14 November), Poh (14 December), Magh (13 January) and Phagun (12 February). The first five months have 31 days, the others 30, and Phagun has 31 days in leap years. Years are counted from 1469, the year of the birth of Guru Nanak, the founder of Sikhism: the year 558 began on 14 March 2026.

The calendar thus fixes some of the Sikh feasts, such as Vaisakhi on 14 April, which the traditional calendar moves from year to year.

## History

Sikhs traditionally used the Bikrami calendar (Vikram Samvat), the lunisolar calendar of northern India, in which the feasts fall on different days every year. The Nanakshahi calendar was drawn up by Pal Singh Purewal, a Sikh living in Canada, and adopted in 2003 by the Shiromani Gurdwara Parbandhak Committee (SGPC) with the approval of the Akal Takht; three feasts stayed on the old calendar. In 2010 the SGPC amended the calendar, tying the beginning of the months and many feasts to the Bikrami calendar again, to which it later in effect returned. The 2003 form, called "Mool Nanakshahi", is still followed by many gurdwaras of the diaspora and by the gurdwara committee of Pakistan, so several Sikh calendars coexist today. The site shows the 2003 form.

## Method of calculation

The year begins on 14 March: from 14 March onwards the Nanakshahi year is the Gregorian year minus 1468, and before 14 March the Gregorian year minus 1469. The days since 14 March are then counted and the lengths of the months subtracted (31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30); what remains falls in Phagun. The computation is in [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts), in the function `jdnToNanakshahi`; the date in Gurmukhi uses the Punjabi digits and month names.

## References

- Pal Singh Purewal, [articles on the Nanakshahi calendar](https://www.purewal.biz/) (fixed dates of the feasts, conversions between calendars).
- Wikipedia: [Nanakshahi calendar](https://en.wikipedia.org/wiki/Nanakshahi_calendar).
