---
title: Calendarul Nanakshahi (sikh)
label: Sikh (Nanakshahi)
summary: >-
  Calendarul solar al sikhismului, adoptat în 2003: 12 luni care încep mereu în aceleași zile ale calendarului gregorian, anul începând la 14 martie și anii numărați din 1469, anul nașterii lui Guru Nanak. Forma lui e încă discutată între comunitățile sikh.
---

## Descriere

Calendarul Nanakshahi are un an solar de aceeași lungime ca anul gregorian, cu 12 luni care încep mereu în aceeași zi: Chet (14 martie), Vaisakh (14 aprilie), Jeth (15 mai), Harh (15 iunie), Sawan (16 iulie), Bhadon (16 august), Assu (15 septembrie), Katak (15 octombrie), Maghar (14 noiembrie), Poh (14 decembrie), Magh (13 ianuarie) și Phagun (12 februarie). Primele cinci luni au 31 de zile, celelalte 30, iar Phagun are 31 de zile în anii bisecți. Anii se numără de la 1469, anul nașterii lui Guru Nanak, întemeietorul sikhismului: anul 558 a început la 14 martie 2026.

Calendarul fixează astfel o parte din sărbătorile sikh, de pildă Vaisakhi, la 14 aprilie, pe care calendarul tradițional le mută de la an la an.

## Istorie

Sikhii au folosit tradițional calendarul Bikrami (Vikram Samvat), calendarul lunisolar al nordului Indiei, după care sărbătorile cad în fiecare an în alte zile. Calendarul Nanakshahi a fost alcătuit de Pal Singh Purewal, sikh stabilit în Canada, și adoptat în 2003 de Shiromani Gurdwara Parbandhak Committee (SGPC), cu aprobarea Akal Takht; trei sărbători au rămas după vechiul calendar. În 2010, SGPC a schimbat calendarul, legând din nou începutul lunilor și multe sărbători de calendarul Bikrami, la care în fapt s-a întors mai târziu. Forma din 2003, numită „Mool Nanakshahi”, e folosită în continuare de multe gurdwara din diaspora și de comitetul gurdwara-lor din Pakistan, așa că astăzi coexistă mai multe calendare sikh. Site-ul arată forma din 2003.

## Metoda de calcul

Anul începe la 14 martie: de la 14 martie încolo, anul Nanakshahi este anul gregorian minus 1468, iar înainte de 14 martie, anul gregorian minus 1469. Se numără apoi zilele de la 14 martie și se scad lungimile lunilor (31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30); ce rămâne cade în Phagun. Calculul se face în [`tools/lib/calendar-systems.ts`](https://github.com/OrthodoxProject/orthodox-synaxarion/blob/main/tools/lib/calendar-systems.ts), funcția `jdnToNanakshahi`; data în gurmukhi folosește cifrele și numele punjabi ale lunilor.

## Referințe

- Pal Singh Purewal, [articole despre calendarul Nanakshahi](https://www.purewal.biz/) (datele fixe ale sărbătorilor, conversii între calendare).
- Wikipedia: [Nanakshahi calendar](https://en.wikipedia.org/wiki/Nanakshahi_calendar).
