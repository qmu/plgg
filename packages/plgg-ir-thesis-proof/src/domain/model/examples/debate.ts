import { SoftStr } from "plgg";

/**
 * The 論争空間 example from `metamodel-semantics.md`
 * §検証カタログ 11 生存判定, encoded as thesis surface
 * syntax so the Dung grounded extension is read off the
 * full evaluator's own `surviving` set (design.md §5.12),
 * not a re-implemented copy: three 論旨 (増税必要論 /
 * 景気失速論 / 外需回復論) as 主張, and the two attacks as
 * `反論` frames — 景気失速論 attacks 増税必要論, and
 * 外需回復論 attacks 景気失速論.
 *
 * Under Dung's grounded semantics the survivors are
 * `{増税必要論, 外需回復論}` (外需回復論 neutralises
 * 景気失速論, so its attack on 増税必要論 is lifted) and
 * 景気失速論 is defeated.
 */
export const 論争空間: SoftStr = `(主張 増税必要論
  :ロジック 因果的
  :ルート (概念 増税)
  (関係 a1 :接続元 (概念 財政悪化) :接続先 (概念 増税)))

(主張 景気失速論
  :ロジック 因果的
  :ルート (概念 増税見送り)
  (関係 b1 :接続元 (概念 需要不足) :接続先 (概念 増税見送り)))

(主張 外需回復論
  :ロジック 因果的
  :ルート (概念 外需回復)
  (関係 c1 :接続元 (概念 輸出増) :接続先 (概念 外需回復)))

(フレーム 反論1 :種別 反論 :接続元 景気失速論 :接続先 増税必要論)
(フレーム 反論2 :種別 反論 :接続元 外需回復論 :接続先 景気失速論)`;
