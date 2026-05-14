/**
 * Constitution model types
 */
export interface ConstitutionArticle {
  id: string;
  article_id: string;
  article_desc: string;
  created_at: Date;
  updated_at: Date;
}

export interface ConstitutionStructured {
  id: string;
  art_no: string;
  name: string;
  art_desc: string | null;
  status: string | null;
  sub_heading: string | null;
  part_no: string | null;
  part_name: string | null;
  clauses: Clause[] | null;
  explanations: Explanation[] | null;
  created_at: Date;
  updated_at: Date;
}

export interface Clause {
  ClauseNo: string;
  ClauseDesc: string;
  SubClauses?: SubClause[];
}

export interface SubClause {
  SubClauseNo: string;
  SubClauseDesc: string;
}

export interface Explanation {
  ExplanationNo: string;
  Explanation: string;
}

export interface ConstitutionPart {
  id: string;
  part_no: string;
  name: string;
  article_numbers: string[];
  created_at: Date;
  updated_at: Date;
}

